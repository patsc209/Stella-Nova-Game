/* Orbit Rally — timed 2-player air-hockey match.
   Fingertips come from MediaPipe hands (js/hands.js), not PoseNet. */

let video;
let handsTracker = null;
let modelLoaded = false;
let livePeople = 0;

// ---- Match settings ----
const MATCH_SECONDS = 20;
const PADDLE_R = 42;
const PUCK_R = 15;
// ---- Tracking smoothing ----
const SMOOTHING = 0.25;       // lower = smoother but more lag between hand and paddle
const HISTORY_LEN = 6;        // frames averaged to cut down fingertip jitter

// ---- Onboarding timings ----
const ONBOARD_INTRO_MS = 3500;
const ONBOARD_DEMO_MS = 4800;   // split evenly across up/down/left/right
const COUNTDOWN_STEP_MS = 900;  // 3, 2, 1, START!

// ---- Game state ----
let paddleA = { x: 160, y: 240, history: [] }; // left half — Player A
let paddleB = { x: 480, y: 240, history: [] }; // right half — Player B (or AI)
let puck = { x: 320, y: 240, vx: 4, vy: 3 };
let particles = [];

let scoreA = 0;
let scoreB = 0;
let timeLeft = MATCH_SECONDS;
let gameState = "lobby"; // lobby | intro | demo | countdown | playing | paused | over
let stateStartTime = 0;
let lastSecondTick = 0;
let flashText = "";
let flashTimer = 0;

// Stella Nova sync
let sync = null;
let roomCode = "";
let playerName = "Player";
let playMode = "solo"; // solo => AI plays B; multi => the person on the right plays B
let tabletGameType = null;
let leavingForOther = false;

function switchTvMode(mode, autostart) {
  if (leavingForOther && !autostart) return;
  leavingForOther = true;
  try {
    sessionStorage.setItem("stella-nova:tv-session", roomCode);
  } catch (_) {
    /* a missing flag makes the next load mint a new code and drop the game */
  }
  const next = new URL(window.location.href);
  next.searchParams.set("mode", mode);
  if (autostart) next.searchParams.set("autostart", "1");
  else next.searchParams.delete("autostart");
  window.location.replace(next.toString());
}
let forceSoloAI = true;
let playerBLive = false;
let playerBMiss = 0;
let uiPhase = "lobby"; // tablet-facing phase

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("game-root");
  pixelDensity(1);
  setStatus("Starting camera…");
  let cameraReady = false;
  video = createCapture(StellaHands.cameraConstraints, () => {
    cameraReady = true;
    if (modelLoaded) {
      setStatus("Hand tracking ready");
      hideStatusSoon();
    } else {
      setStatus("Camera ready — loading hand tracking…");
    }
  });
  video.hide();

  handsTracker = StellaHands.attach(video.elt, { people: true });
  handsTracker.ready
    .then(() => {
      modelLoaded = true;
      if (cameraReady) {
        setStatus("Hand tracking ready");
        hideStatusSoon();
      } else {
        setStatus("Hand tracking ready — starting camera…");
      }
    })
    .catch((err) => {
      console.error(err);
      setStatus("Hand tracking failed — check the connection and reload");
    });

  resetPuck();
  // scale default paddle positions after canvas size known
  paddleA.x = width * 0.25;
  paddleA.y = height * 0.5;
  paddleB.x = width * 0.75;
  paddleB.y = height * 0.5;
  puck.x = width / 2;
  puck.y = height / 2;

  lastSecondTick = millis();
  stateStartTime = millis();
  initRoomAndSync();
  updateLobbyUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
}

function hideStatusSoon() {
  const el = document.getElementById("status");
  if (!el) return;
  setTimeout(() => el.classList.add("hidden"), 1600);
}

function initRoomAndSync() {
  const params = new URLSearchParams(window.location.search);
  roomCode = (params.get("room") || PlanetHockeySync.generateRoomCode()).toUpperCase();
  playerName = params.get("name") || localStorage.getItem("ph-player-name") || "Player";
  if (!params.get("room")) {
    params.set("room", roomCode);
    history.replaceState(null, "", "?" + params.toString());
  }
  const codeEl = document.getElementById("room-code-display");
  if (codeEl) codeEl.textContent = roomCode;

  const existing = PlanetHockeySync.loadState(roomCode);
  if (existing && existing.playMode) applyPlayMode(existing.playMode);

  sync = PlanetHockeySync.createSync(roomCode, "game");
  publishOrbitState();
  sync.on((msg) => {
    if (msg.type === "command") handleCommand(msg.action);
    if (msg.type === "hello" && msg.role === "tablet") publishOrbitState();
    if ((msg.type === "state" || msg.type === "joined") && msg.state) {
      // Only the tablet's choice counts. A late room echo can still say solo
      // and would put the computer back on the pink alien.
      if (msg.from === "tablet" && msg.state.playMode) applyPlayMode(msg.state.playMode);
      if (msg.state.playerName && msg.from !== "game") playerName = msg.state.playerName;
      if (msg.from === "tablet" && (msg.state.gameType === "stars" || msg.state.gameType === "orbit")) {
        tabletGameType = msg.state.gameType;
      }
      if (msg.from === "tablet" && tabletGameType === "stars") switchTvMode("stars", false);
    }
  });

  if (window.STELLA_TV_AUTOSTART) {
    setTimeout(() => {
      if (gameState === "lobby") startOrbitMatch();
    }, 700);
  }
}

function applyPlayMode(mode) {
  if (mode !== "solo" && mode !== "multi") return;
  playMode = mode;
  forceSoloAI = mode !== "multi";
}

function publishOrbitState() {
  if (!sync || leavingForOther) return;
  // Map internal states to tablet phases
  let phase = "lobby";
  if (gameState === "intro" || gameState === "demo" || gameState === "countdown") phase = "countdown";
  else if (gameState === "playing") phase = "playing";
  else if (gameState === "paused") phase = "paused";
  else if (gameState === "over") phase = "over";
  else if (gameState === "lobby") phase = "lobby";
  uiPhase = phase;
  sync.publish({
    phase,
    score: scoreA, // stars credited from Player A goals
    scoreA,
    scoreB,
    timeLeft,
    bestScore: scoreA,
    playerName,
    hostReady: true,
    gameType: "orbit",
    playMode,
    countdown: gameState === "countdown" ? Math.max(1, 3 - Math.floor((millis() - stateStartTime) / COUNTDOWN_STEP_MS)) : 3,
  });
}

function handleCommand(action) {
  if ((action === "play" || action === "restart") && tabletGameType === "stars") {
    switchTvMode("stars", true);
    return;
  }
  if (action === "play" && (gameState === "lobby" || gameState === "over")) {
    startOrbitMatch();
  } else if (action === "pause" && gameState === "playing") {
    gameState = "paused";
    publishOrbitState();
    updateLobbyUI();
  } else if (action === "resume" && gameState === "paused") {
    gameState = "playing";
    lastSecondTick = millis();
    publishOrbitState();
    updateLobbyUI();
  } else if (action === "restart") {
    startOrbitMatch();
  } else if (action === "home") {
    gameState = "lobby";
    scoreA = 0;
    scoreB = 0;
    timeLeft = MATCH_SECONDS;
    particles = [];
    resetPuck();
    publishOrbitState();
    updateLobbyUI();
  }
}

function startOrbitMatch() {
  scoreA = 0;
  scoreB = 0;
  timeLeft = MATCH_SECONDS;
  particles = [];
  paddleA.history = [];
  paddleB.history = [];
  playerBLive = false;
  playerBMiss = 0;
  resetPuck();
  gameState = "intro";
  stateStartTime = millis();
  lastSecondTick = millis();
  publishOrbitState();
  updateLobbyUI();
}

function updateLobbyUI() {
  const lobby = document.getElementById("lobby-overlay");
  const paused = document.getElementById("paused-overlay");
  if (lobby) lobby.classList.toggle("visible", gameState === "lobby");
  if (paused) paused.classList.toggle("visible", gameState === "paused");
}

function draw() {
  background(5, 6, 18);

  // Mirrored full-bleed feed — same coordinate space as fingertip tracking.
  push();
  translate(width, 0);
  scale(-1, 1);
  if (video) {
    tint(255, 140);
    image(video, 0, 0, width, height);
    noTint();
  }
  pop();

  if (gameState === "lobby") {
    if (!modelLoaded) {
      fill(255, 220);
      textAlign(CENTER, CENTER);
      textSize(22);
      text("Warming up camera & hand tracking…", width / 2, height - 48);
    }
    return;
  }

  if (gameState === "paused") {
    drawTable();
    drawGoals();
    drawPuck();
    drawAlienPaddle(paddleA.x, paddleA.y, 200, "A");
    drawAlienPaddle(paddleB.x, paddleB.y, 320, "B");
    drawHUD();
    return;
  }

  if (gameState === "intro") {
    drawIntro();
    if (millis() - stateStartTime > ONBOARD_INTRO_MS) {
      gameState = "demo";
      stateStartTime = millis();
      publishOrbitState();
    }
    return;
  }

  if (gameState === "demo") {
    drawDemo();
    if (millis() - stateStartTime > ONBOARD_DEMO_MS) {
      gameState = "countdown";
      stateStartTime = millis();
      publishOrbitState();
    }
    return;
  }

  if (gameState === "countdown") {
    drawCountdown();
    return;
  }

  // ---- playing / over ----
  drawTable();
  drawGoals();

  if (gameState === "playing") {
    updatePaddles();
    updatePuck();
    updateTimer();
  }

  drawPuck();
  updateAndDrawParticles();
  drawAlienPaddle(paddleA.x, paddleA.y, 200, 'A'); // Player A — blue alien
  drawAlienPaddle(paddleB.x, paddleB.y, 320, 'B'); // Player B — pink alien

  drawHUD();
  if (flashTimer > 0) {
    drawFlash();
    flashTimer--;
  }
  if (gameState === "over") {
    drawMatchOver();
  }
}

// ---- Onboarding screens ----
function drawPersonVector(x, y, hue, label) {
  colorMode(HSB, 360, 100, 100, 255);
  push();
  translate(x, y);
  noStroke();
  fill(hue, 55, 95);
  circle(0, -70, 50); // head
  rect(-30, -45, 60, 90, 20); // body
  stroke(hue, 55, 95);
  strokeWeight(14);
  strokeCap(ROUND);
  line(-30, -18, -58, 22); // left arm
  line(30, -18, 58, 22);   // right arm
  pop();
  colorMode(RGB, 255);

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(18);
  text(label, x, y + 85);
}

function drawIntro() {
  noStroke();
  fill(0, 0, 0, 130);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(30);
  text("Get Ready!", width / 2, 70);
  textSize(16);
  fill(255, 255, 255, 200);
  text(forceSoloAI ? "You control the left alien — AI plays the right" : "Each player controls the alien on their own side", width / 2, 105);

  drawPersonVector(width * 0.22, height / 2, 200, "Player 1");
  drawPersonVector(width * 0.78, height / 2, 320, "Player 2");

  // center divider so the "your half" idea is visible from the start
  stroke(255, 255, 255, 60);
  strokeWeight(2);
  line(width / 2, 40, width / 2, height - 40);
  noStroke();
}

function drawDemo() {
  noStroke();
  fill(0, 0, 0, 130);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(22);
  text("Move your arm up, down, left and right", width / 2, 60);
  fill(255, 255, 255, 190);
  textSize(15);
  text("Your alien stays on your own half of the screen", width / 2, 88);

  let dirs = ["UP", "DOWN", "LEFT", "RIGHT"];
  let stepMs = ONBOARD_DEMO_MS / dirs.length;
  let idx = floor((millis() - stateStartTime) / stepMs) % dirs.length;
  let dir = dirs[idx];

  let cx = width / 2;
  let cy = height / 2 + 20;
  let offset = 70;
  let mx = cx, my = cy;
  if (dir === "UP") my -= offset;
  else if (dir === "DOWN") my += offset;
  else if (dir === "LEFT") mx -= offset;
  else if (dir === "RIGHT") mx += offset;

  drawDirectionArrow(cx, cy, dir);
  drawAlienPaddle(mx, my, 50, 'A'); // gold demo alien

  fill(255, 221, 87);
  textSize(26);
  text(dir, width / 2, height - 60);
}

function drawDirectionArrow(cx, cy, dir) {
  push();
  translate(cx, cy);
  stroke(255, 221, 87, 160);
  strokeWeight(4);
  let len = 55;
  let ax = 0, ay = 0;
  if (dir === "UP") ay = -len;
  else if (dir === "DOWN") ay = len;
  else if (dir === "LEFT") ax = -len;
  else if (dir === "RIGHT") ax = len;
  line(0, 0, ax, ay);
  noStroke();
  fill(255, 221, 87, 160);
  circle(ax, ay, 14);
  pop();
}

function drawCountdown() {
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  let elapsed = millis() - stateStartTime;
  let step = floor(elapsed / COUNTDOWN_STEP_MS);
  let values = ["3", "2", "1", "START!"];

  if (step >= values.length) {
    gameState = "playing";
    stateStartTime = millis();
    resetPuck();
    return;
  }

  fill(255, 221, 87);
  textAlign(CENTER, CENTER);
  textSize(step === values.length - 1 ? 64 : 96);
  text(values[step], width / 2, height / 2);
}

// ---- Hand tracking ----
function smoothPoint(paddle, rawPoint) {
  paddle.history.push(rawPoint);
  if (paddle.history.length > HISTORY_LEN) paddle.history.shift();
  let avgX = paddle.history.reduce((sum, p) => sum + p.x, 0) / paddle.history.length;
  let avgY = paddle.history.reduce((sum, p) => sum + p.y, 0) / paddle.history.length;
  return { x: avgX, y: avgY };
}

function followPaddle(paddle, hand, minX, maxX) {
  let smoothed = smoothPoint(paddle, hand);
  paddle.x = lerp(paddle.x, constrain(smoothed.x, minX, maxX), SMOOTHING);
  paddle.y = lerp(paddle.y, constrain(smoothed.y, PADDLE_R, height - PADDLE_R), SMOOTHING);
}

function updatePaddles() {
  // Left hand drives the blue alien. In multiplayer the other hand drives
  // pink. Pose tracking often sees only one body when two people stand
  // together, so two hands are enough — the computer does not take pink.
  const tips = handsTracker ? handsTracker.update() : [];
  const people = handsTracker && handsTracker.people ? handsTracker.people : [];
  const hands = tips.slice().sort(function (a, b) {
    return a.x - b.x;
  });
  let leftTip = null;
  let rightTip = null;

  if (!forceSoloAI) {
    if (hands.length >= 2) {
      leftTip = hands[0];
      rightTip = hands[hands.length - 1];
    } else if (people.length >= 2) {
      leftTip = people[0].tip;
      rightTip = people[people.length - 1].tip;
    } else if (hands.length === 1) {
      leftTip = hands[0];
    } else if (people[0]) {
      leftTip = people[0].tip;
    }
  } else if (people.length) {
    leftTip = people[0].tip;
  } else {
    leftTip = hands[0] || null;
  }

  livePeople = rightTip ? 2 : leftTip ? 1 : 0;

  if (leftTip) {
    followPaddle(paddleA, leftTip, PADDLE_R, width / 2 - PADDLE_R);
  }

  if (!forceSoloAI && rightTip) {
    playerBMiss = 0;
    playerBLive = true;
    followPaddle(paddleB, rightTip, width / 2 + PADDLE_R, width - PADDLE_R);
  } else if (forceSoloAI) {
    playerBLive = false;
    playerBMiss = 0;
    paddleB.x = lerp(paddleB.x, width - 90, 0.03);
    paddleB.y = lerp(paddleB.y, puck.y, 0.035);
    paddleB.y = constrain(paddleB.y, PADDLE_R, height - PADDLE_R);
  } else {
    playerBLive = false;
  }
}

// ---- Puck physics ----
function updatePuck() {
  puck.x += puck.vx;
  puck.y += puck.vy;

  if (puck.y < PUCK_R || puck.y > height - PUCK_R) {
    puck.vy *= -1;
    puck.y = constrain(puck.y, PUCK_R, height - PUCK_R);
  }

  handlePaddleCollision(paddleA);
  handlePaddleCollision(paddleB);

  if (puck.x < 0) {
    onGoal('B'); // exited left edge -> Player B scores
  } else if (puck.x > width) {
    onGoal('A'); // exited right edge -> Player A scores
  }
}

function handlePaddleCollision(paddle) {
  let d = dist(puck.x, puck.y, paddle.x, paddle.y);
  if (d < PUCK_R + PADDLE_R) {
    let angle = atan2(puck.y - paddle.y, puck.x - paddle.x);
    let speed = min(mag(puck.vx, puck.vy) * 1.08, 11);
    speed = max(speed, 4);
    puck.vx = cos(angle) * speed;
    puck.vy = sin(angle) * speed;
    let overlap = PUCK_R + PADDLE_R - d;
    puck.x += cos(angle) * overlap;
    puck.y += sin(angle) * overlap;
  }
}

function onGoal(scorer) {
  if (scorer === "A") {
    scoreA += 1;
    flash("Player A scores!");
  } else {
    scoreB += 1;
    flash("Player B scores!");
  }
  spawnParticles(puck.x, puck.y, scorer === "A" ? 200 : 320);
  resetPuck();
  publishOrbitState();
}

function resetPuck() {
  puck.x = width / 2;
  puck.y = height / 2;
  let angle = random(-0.5, 0.5) + (random() < 0.5 ? 0 : PI);
  puck.vx = cos(angle) * 4.5;
  puck.vy = sin(angle) * 4.5;
}

// ---- Timer ----
function updateTimer() {
  if (millis() - lastSecondTick > 1000) {
    lastSecondTick = millis();
    timeLeft -= 1;
    publishOrbitState();
    if (timeLeft <= 0) {
      timeLeft = 0;
      gameState = "over";
      publishOrbitState();
      updateLobbyUI();
    }
  }
}

// ---- Drawing: table, goals, puck, paddles ----
function drawTable() {
  stroke(255, 255, 255, 50);
  strokeWeight(2);
  line(width / 2, 0, width / 2, height);
  noFill();
  circle(width / 2, height / 2, 80);
  noStroke();
}

function drawGoals() {
  noStroke();
  fill(90, 160, 255, 70);
  rect(0, 0, 14, height); // left goal (Player B scores here)
  fill(255, 110, 200, 70);
  rect(width - 14, 0, 14, height); // right goal (Player A scores here)
}

function drawPuck() {
  colorMode(HSB, 360, 100, 100, 255);
  push();
  translate(puck.x, puck.y);
  rotate(frameCount * 0.05);
  noStroke();
  fill(50, 30, 100, 60);
  circle(0, 0, PUCK_R * 2.4);
  fill(50, 70, 100, 230);
  star(0, 0, PUCK_R * 0.45, PUCK_R, 5);
  pop();
  colorMode(RGB, 255);
}

function star(x, y, radiusInner, radiusOuter, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
    vertex(x + cos(a) * radiusOuter, y + sin(a) * radiusOuter);
    vertex(x + cos(a + halfAngle) * radiusInner, y + sin(a + halfAngle) * radiusInner);
  }
  endShape(CLOSE);
}

function drawAlienPaddle(x, y, hue, tag) {
  colorMode(HSB, 360, 100, 100, 255);
  push();
  translate(x, y);

  // glow
  noStroke();
  fill(hue, 50, 100, 50);
  circle(0, 0, PADDLE_R * 2.5);

  // antenna
  stroke(hue, 70, 60);
  strokeWeight(4);
  let antX = tag === 'A' ? -12 : 12;
  line(0, -PADDLE_R * 0.65, antX, -PADDLE_R * 1.05);
  noStroke();
  fill(hue, 70, 95);
  circle(antX, -PADDLE_R * 1.05, 10);

  // body
  fill(hue, 70, 95);
  circle(0, 0, PADDLE_R * 1.8);

  // belly
  fill(hue, 30, 100);
  circle(0, PADDLE_R * 0.25, PADDLE_R * 0.9);

  // eyes
  fill(0, 0, 100);
  circle(-PADDLE_R * 0.35, -PADDLE_R * 0.15, PADDLE_R * 0.55);
  circle(PADDLE_R * 0.35, -PADDLE_R * 0.15, PADDLE_R * 0.55);
  fill(hue, 80, 20);
  circle(-PADDLE_R * 0.3, -PADDLE_R * 0.1, PADDLE_R * 0.22);
  circle(PADDLE_R * 0.4, -PADDLE_R * 0.1, PADDLE_R * 0.22);

  pop();
  colorMode(RGB, 255);
}

// ---- Goal celebration particles ----
function spawnParticles(x, y, hue) {
  colorMode(HSB, 360, 100, 100, 255);
  for (let i = 0; i < 16; i++) {
    let angle = random(TWO_PI);
    let speed = random(2, 6);
    particles.push({
      x: x, y: y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      life: 255,
      hue: hue
    });
  }
  colorMode(RGB, 255);
}

function updateAndDrawParticles() {
  colorMode(HSB, 360, 100, 100, 255);
  noStroke();
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 8;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    fill(p.hue, 80, 100, p.life);
    circle(p.x, p.y, 8);
  }
  colorMode(RGB, 255);
}

// ---- HUD / messages ----
function drawHUD() {
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, 0, width, 50);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text(scoreA + "   —   " + scoreB, width / 2, 26);

  let mins = floor(timeLeft / 60);
  let secs = timeLeft % 60;
  let timeStr = mins + ":" + (secs < 10 ? "0" : "") + secs;
  textAlign(LEFT, CENTER);
  textSize(16);
  text("⏱ " + timeStr, 16, 26);

  textAlign(RIGHT, CENTER);
  text(forceSoloAI ? "Player B: AI" : playerBLive ? "Player B: live" : "Player B: waiting", width - 16, 26);
  textAlign(CENTER, TOP);
  textSize(14);
  fill(255, 200);
  text("STELLA NOVA · ORBIT RALLY", width / 2, 54);
}

function flash(msg) {
  flashText = msg;
  flashTimer = 45;
}

function drawFlash() {
  fill(255, 255, 255, min(255, flashTimer * 6));
  textAlign(CENTER, CENTER);
  textSize(28);
  text(flashText, width / 2, height / 2);
}

function drawMatchOver() {
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(36);
  text("Time's up!", width / 2, height / 2 - 50);

  textSize(24);
  let result = scoreA === scoreB
    ? "It's a tie — " + scoreA + " each!"
    : (scoreA > scoreB ? "Player A wins " : "Player B wins ") + scoreA + " – " + scoreB;
  text(result, width / 2, height / 2 - 8);

  textSize(16);
  fill(200);
  text("Press R to play again", width / 2, height / 2 + 32);
}

function keyPressed() {
  if (key === "p" || key === "P") {
    if (gameState === "lobby" || gameState === "over") startOrbitMatch();
  }
  if (key === " ") {
    if (gameState === "playing") {
      gameState = "paused";
      publishOrbitState();
      updateLobbyUI();
    } else if (gameState === "paused") {
      gameState = "playing";
      lastSecondTick = millis();
      publishOrbitState();
      updateLobbyUI();
    }
  }
  if (key === "r" || key === "R") {
    restartMatch();
  }
  if (key === "o" || key === "O") {
    gameState = "intro";
    stateStartTime = millis();
    publishOrbitState();
    updateLobbyUI();
  }
}

function restartMatch() {
  startOrbitMatch();
}