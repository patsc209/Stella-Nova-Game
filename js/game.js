/* Planet Hockey — TV / webcam PoseNet slash game */

let video;
let poseNet;
let poses = [];
let modelLoaded = false;

let planets = [];
let particles = [];
let trails = { left: [], right: [] };

let score = 0;
let bestScore = 0;
let timeLeft = 30;
let gamePhase = "lobby"; // lobby | countdown | playing | paused | over
let countdownValue = 3;
let lastSpawn = 0;
let spawnInterval = 900;
let lastSecondTick = 0;
let countdownTick = 0;
let statusEl;

const TRAIL_MAX_LEN = 14;
const HIT_RADIUS_PAD = 16;
const GAME_SECONDS = 30;

const PLANET_TYPES = [
  { name: "Mercury", points: 5, r: [22, 28], colors: ["#b1b1b1", "#8a8a8a", "#d0d0d0"] },
  { name: "Venus", points: 8, r: [26, 34], colors: ["#e8c07a", "#c9a25a", "#f3d9a4"] },
  { name: "Earth", points: 10, r: [28, 36], colors: ["#3d8bfd", "#2ecc71", "#a8e6ff"] },
  { name: "Mars", points: 8, r: [24, 32], colors: ["#e07040", "#c04020", "#f0a080"] },
  { name: "Jupiter", points: 15, r: [40, 52], colors: ["#d4a574", "#c68642", "#f0d0a0"] },
  { name: "Saturn", points: 20, r: [36, 46], colors: ["#f0d590", "#e0c060", "#fff2c4"], rings: true },
  { name: "Uranus", points: 12, r: [30, 38], colors: ["#7ec8e3", "#5aa8c8", "#b8e8f8"] },
  { name: "Neptune", points: 12, r: [30, 38], colors: ["#4169e1", "#2a4cb0", "#7aa0ff"] },
];

let sync = null;
let roomCode = "";
let playerName = "Player";

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("game-root");
  pixelDensity(1);

  statusEl = document.getElementById("status");
  video = createCapture(VIDEO, () => {
    setStatus("Camera ready — loading PoseNet…");
  });
  video.size(Math.min(1280, windowWidth), Math.min(720, windowHeight));
  video.hide();

  poseNet = ml5.poseNet(video, () => {
    modelLoaded = true;
    setStatus("PoseNet ready");
    hideStatusSoon();
  });
  poseNet.on("pose", (results) => {
    poses = results;
  });

  initRoomAndSync();
  lastSpawn = millis();
  lastSecondTick = millis();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.classList.remove("hidden");
}

function hideStatusSoon() {
  if (!statusEl) return;
  setTimeout(() => statusEl.classList.add("hidden"), 1600);
}

function initRoomAndSync() {
  const params = new URLSearchParams(window.location.search);
  roomCode = (params.get("room") || PlanetHockeySync.generateRoomCode()).toUpperCase();
  playerName = params.get("name") || localStorage.getItem("ph-player-name") || "Player";

  // Persist room in URL for refresh / sharing between tabs
  if (!params.get("room")) {
    params.set("room", roomCode);
    history.replaceState(null, "", "?" + params.toString());
  }

  document.getElementById("room-code-display").textContent = roomCode;

  const existing = PlanetHockeySync.loadState(roomCode);
  if (existing && existing.bestScore) bestScore = existing.bestScore;

  sync = PlanetHockeySync.createSync(roomCode, "game");
  sync.publish({
    phase: "lobby",
    score: 0,
    timeLeft: GAME_SECONDS,
    bestScore,
    playerName,
    hostReady: true,
    tabletReady: existing ? !!existing.tabletReady : false,
  });

  sync.on((msg) => {
    if (msg.type === "command") {
      handleCommand(msg.action);
    }
    if (msg.type === "hello" && msg.role === "tablet") {
      sync.publish({ hostReady: true });
    }
    if (msg.type === "state" && msg.from === "tablet" && msg.state) {
      if (msg.state.playerName) playerName = msg.state.playerName;
      if (msg.state.tabletReady && gamePhase === "lobby") {
        // tablet signaled ready via state — wait for explicit play command
      }
    }
  });

  updateLobbyUI();
}

function handleCommand(action) {
  if (action === "play" && (gamePhase === "lobby" || gamePhase === "over")) {
    startCountdown();
  } else if (action === "pause" && gamePhase === "playing") {
    setPhase("paused");
  } else if (action === "resume" && gamePhase === "paused") {
    setPhase("playing");
    lastSecondTick = millis();
  } else if (action === "restart") {
    startCountdown();
  } else if (action === "home") {
    resetToLobby();
  }
}

function setPhase(phase) {
  gamePhase = phase;
  publishGameState();
  updateLobbyUI();
}

function publishGameState() {
  if (!sync) return;
  sync.publish({
    phase: gamePhase,
    score,
    timeLeft,
    bestScore,
    playerName,
    hostReady: true,
    countdown: countdownValue,
  });
}

function startCountdown() {
  planets = [];
  particles = [];
  trails = { left: [], right: [] };
  score = 0;
  timeLeft = GAME_SECONDS;
  spawnInterval = 900;
  countdownValue = 3;
  countdownTick = millis();
  lastSpawn = millis();
  lastSecondTick = millis();
  setPhase("countdown");
}

function resetToLobby() {
  planets = [];
  particles = [];
  trails = { left: [], right: [] };
  score = 0;
  timeLeft = GAME_SECONDS;
  setPhase("lobby");
}

function updateLobbyUI() {
  const lobby = document.getElementById("lobby-overlay");
  const paused = document.getElementById("paused-overlay");
  if (!lobby || !paused) return;

  lobby.classList.toggle("visible", gamePhase === "lobby");
  paused.classList.toggle("visible", gamePhase === "paused");
}

function draw() {
  background(8, 12, 28);

  // Mirrored camera
  push();
  translate(width, 0);
  scale(-1, 1);
  if (video) {
    const vw = video.width;
    const vh = video.height;
    const scale = Math.max(width / vw, height / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    image(video, (width - dw) / 2, (height - dh) / 2, dw, dh);
  }
  pop();

  // Soft vignette for readability
  drawVignette();

  if (gamePhase === "lobby") {
    drawWaitingHint();
    return;
  }

  if (gamePhase === "countdown") {
    updateCountdown();
    drawCountdown();
    drawHUD();
    return;
  }

  if (gamePhase === "playing") {
    updateHandTrails();
    spawnPlanets();
    updateAndDrawPlanets();
    drawTrails();
    updateAndDrawParticles();
    checkSlashes();
    updateTimer();
    drawHUD();
    return;
  }

  if (gamePhase === "paused") {
    updateAndDrawPlanets(false);
    drawTrails();
    updateAndDrawParticles();
    drawHUD();
    return;
  }

  if (gamePhase === "over") {
    updateAndDrawParticles();
    drawHUD();
    drawGameOver();
  }
}

function drawVignette() {
  noFill();
  for (let i = 0; i < 6; i++) {
    stroke(8, 12, 28, 30 + i * 18);
    strokeWeight(40);
    rect(20 + i * 8, 20 + i * 8, width - 40 - i * 16, height - 40 - i * 16, 24);
  }
  noStroke();
}

function drawWaitingHint() {
  // Minimal on-canvas hint; main lobby is HTML overlay
  if (!modelLoaded) {
    fill(255, 220);
    textAlign(CENTER, CENTER);
    textSize(22);
    text("Warming up camera & PoseNet…", width / 2, height - 48);
  }
}

function updateCountdown() {
  if (millis() - countdownTick > 1000) {
    countdownTick = millis();
    countdownValue -= 1;
    publishGameState();
    if (countdownValue <= 0) {
      lastSecondTick = millis();
      lastSpawn = millis();
      setPhase("playing");
    }
  }
}

function drawCountdown() {
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text("Have you stretched those arms yet?", width / 2, height / 2 - 90);
  textSize(160);
  textStyle(BOLD);
  text(String(Math.max(countdownValue, 1)), width / 2, height / 2 + 20);
  textStyle(NORMAL);
}

// ---- Hand tracking ----
function getMirroredKeypoint(pose, partName) {
  const kp = pose.pose.keypoints.find((k) => k.part === partName);
  if (kp && kp.score > 0.25) {
    // Map from video coordinate space into canvas (mirrored)
    const mapped = mapVideoToCanvas(kp.position.x, kp.position.y);
    return { x: width - mapped.x, y: mapped.y };
  }
  return null;
}

function mapVideoToCanvas(vx, vy) {
  const vw = video.width;
  const vh = video.height;
  const scale = Math.max(width / vw, height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const ox = (width - dw) / 2;
  const oy = (height - dh) / 2;
  return {
    x: ox + vx * scale,
    y: oy + vy * scale,
  };
}

function updateHandTrails() {
  let leftPt = null;
  let rightPt = null;
  if (poses.length > 0) {
    leftPt = getMirroredKeypoint(poses[0], "leftWrist");
    rightPt = getMirroredKeypoint(poses[0], "rightWrist");
  }

  // Mouse / trackpad fallback for demos without a clear PoseNet lock
  if (!leftPt && !rightPt && mouseIsPressed) {
    rightPt = { x: mouseX, y: mouseY };
  }

  updateTrail("left", leftPt);
  updateTrail("right", rightPt);
}

function updateTrail(side, pt) {
  if (pt) {
    trails[side].push(pt);
    if (trails[side].length > TRAIL_MAX_LEN) trails[side].shift();
  } else if (trails[side].length > 0) {
    trails[side].shift();
  }
}

function drawTrails() {
  drawSingleTrail(trails.left, color(120, 200, 255));
  drawSingleTrail(trails.right, color(255, 140, 220));
}

function drawSingleTrail(trail, col) {
  if (trail.length < 2) {
    if (trail.length === 1) {
      noStroke();
      fill(red(col), green(col), blue(col), 200);
      circle(trail[0].x, trail[0].y, 18);
    }
    return;
  }
  noFill();
  for (let i = 1; i < trail.length; i++) {
    const a = map(i, 0, trail.length - 1, 40, 255);
    const w = map(i, 0, trail.length - 1, 3, 16);
    stroke(red(col), green(col), blue(col), a);
    strokeWeight(w);
    line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
  }
  const tip = trail[trail.length - 1];
  noStroke();
  fill(red(col), green(col), blue(col), 220);
  circle(tip.x, tip.y, 22);
}

// ---- Planets ----
function spawnPlanets() {
  if (millis() - lastSpawn > spawnInterval) {
    lastSpawn = millis();
    const type = random(PLANET_TYPES);
    const r = random(type.r[0], type.r[1]);
    planets.push({
      type,
      x: random(r + 20, width - r - 20),
      y: height + r + 10,
      r,
      vy: random(2.4, 4.6),
      vx: random(-0.7, 0.7),
      rot: random(TWO_PI),
      spin: random(-0.02, 0.02),
    });
    spawnInterval = max(380, spawnInterval - 8);
  }
}

function updateAndDrawPlanets(move = true) {
  for (let i = planets.length - 1; i >= 0; i--) {
    const p = planets[i];
    if (move) {
      p.y -= p.vy;
      p.x += p.vx;
      p.rot += p.spin;
    }
    if (p.y + p.r < -40) {
      planets.splice(i, 1);
      continue;
    }
    drawPlanet(p);
  }
}

function drawPlanet(p) {
  const c = p.type.colors;
  push();
  translate(p.x, p.y);
  rotate(p.rot);

  if (p.type.rings) {
    noFill();
    stroke(255, 230, 160, 160);
    strokeWeight(4);
    ellipse(0, 0, p.r * 2.8, p.r * 0.9);
    stroke(255, 210, 120, 100);
    strokeWeight(2);
    ellipse(0, 0, p.r * 3.1, p.r * 1.05);
    noStroke();
  }

  // Glow
  noStroke();
  fill(red(color(c[0])), green(color(c[0])), blue(color(c[0])), 50);
  circle(0, 0, p.r * 2.6);

  // Body
  fill(c[0]);
  circle(0, 0, p.r * 2);
  fill(c[1]);
  arc(0, 0, p.r * 2, p.r * 2, 0, PI);
  fill(c[2]);
  circle(-p.r * 0.28, -p.r * 0.28, p.r * 0.7);

  // Points badge
  fill(0, 0, 0, 140);
  circle(p.r * 0.55, p.r * 0.55, 22);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(11);
  text("+" + p.type.points, p.r * 0.55, p.r * 0.55);

  pop();
}

// ---- Collision ----
function checkSlashes() {
  checkTrailAgainstPlanets(trails.left);
  checkTrailAgainstPlanets(trails.right);
}

function checkTrailAgainstPlanets(trail) {
  if (trail.length < 2) return;
  for (let i = planets.length - 1; i >= 0; i--) {
    const p = planets[i];
    for (let j = 1; j < trail.length; j++) {
      const d = distToSegment(
        p.x,
        p.y,
        trail[j - 1].x,
        trail[j - 1].y,
        trail[j].x,
        trail[j].y
      );
      if (d < p.r + HIT_RADIUS_PAD) {
        popPlanet(i);
        break;
      }
    }
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = constrain(t, 0, 1);
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

function popPlanet(index) {
  const p = planets[index];
  spawnParticles(p.x, p.y, color(p.type.colors[0]));
  score += p.type.points;
  if (score > bestScore) bestScore = score;
  planets.splice(index, 1);
  publishGameState();
}

function spawnParticles(x, y, col) {
  for (let i = 0; i < 16; i++) {
    const angle = random(TWO_PI);
    const speed = random(2, 7);
    particles.push({
      x,
      y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      life: 255,
      col,
      size: random(5, 11),
    });
  }
}

function updateAndDrawParticles() {
  noStroke();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life -= 10;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    fill(red(p.col), green(p.col), blue(p.col), p.life);
    circle(p.x, p.y, p.size);
  }
}

function updateTimer() {
  if (millis() - lastSecondTick > 1000) {
    lastSecondTick = millis();
    timeLeft -= 1;
    publishGameState();
    if (timeLeft <= 0) {
      timeLeft = 0;
      if (score > bestScore) bestScore = score;
      setPhase("over");
    }
  }
}

function drawHUD() {
  const pad = 24;
  // Score pill
  noStroke();
  fill(20, 24, 48, 180);
  rect(pad, pad, 200, 64, 18);
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(14);
  text(playerName.toUpperCase(), pad + 18, pad + 22);
  textSize(28);
  textStyle(BOLD);
  text(String(score), pad + 18, pad + 46);
  textStyle(NORMAL);

  // Timer
  fill(20, 24, 48, 180);
  rect(width - pad - 120, pad, 120, 64, 18);
  fill(timeLeft <= 5 ? "#ff7b7b" : "#ffffff");
  textAlign(CENTER, CENTER);
  textSize(28);
  textStyle(BOLD);
  text(String(timeLeft), width - pad - 60, pad + 34);
  textStyle(NORMAL);

  // Brand
  fill(255, 200);
  textAlign(CENTER, TOP);
  textSize(16);
  text("PLANET HOCKEY", width / 2, pad + 8);
}

function drawGameOver() {
  fill(8, 12, 28, 190);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  textStyle(BOLD);
  text("Nice work!", width / 2, height / 2 - 60);
  textStyle(NORMAL);
  textSize(28);
  text("Final score  " + score, width / 2, height / 2);
  textSize(18);
  fill(200);
  text("Best  " + bestScore + "   ·   Use the tablet to play again", width / 2, height / 2 + 48);
}

// Keyboard helpers for demo without tablet
function keyPressed() {
  if (key === "p" || key === "P") {
    if (gamePhase === "lobby" || gamePhase === "over") startCountdown();
  } else if (key === " ") {
    if (gamePhase === "playing") setPhase("paused");
    else if (gamePhase === "paused") {
      setPhase("playing");
      lastSecondTick = millis();
    }
  } else if (key === "r" || key === "R") {
    startCountdown();
  }
}
