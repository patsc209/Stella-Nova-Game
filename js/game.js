/* Stella Nova — TV / webcam PoseNet star-slash game */

let video;
let poseNet;
let poses = [];
let modelLoaded = false;

let stars = [];
let particles = [];
let trails = { left: [], right: [] };

let score = 0;
let bestScore = 0;
let timeLeft = 30;
let gamePhase = "lobby"; // lobby | countdown | playing | paused | over
let countdownValue = 3;
let lastSpawn = 0;
let spawnInterval = 750;
let lastSecondTick = 0;
let countdownTick = 0;
let statusEl;

const TRAIL_MAX_LEN = 14;
// Slightly larger hit pad helps when standing farther from a big screen
const HIT_RADIUS_PAD = 18;
const GAME_SECONDS = 30;
const WRIST_MIN_SCORE = 0.15;
const WRIST_GOOD_SCORE = 0.32;
const HAND_SMOOTH = 0.55; // higher = snappier slash response

let sync = null;
let roomCode = "";
let playerName = "Player";
let smoothHands = { left: null, right: null };

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("game-root");
  pixelDensity(1);

  statusEl = document.getElementById("status");
  video = createCapture(VIDEO, () => {
    setStatus("Camera ready — loading PoseNet…");
  });
  // Match video tracking space to the full screen (key far-distance /
  // big-TV fix from the updated Star Slash sketch). A smaller fixed video
  // made arm reaches near the edges barely move in tracked coordinates.
  video.size(width, height);
  video.hide();

  poseNet = ml5.poseNet(
    video,
    {
      detectionType: "single",
      maxPoseDetections: 1,
      minConfidence: 0.15,
      scoreThreshold: 0.2,
      imageScaleFactor: 0.6,
      outputStride: 16,
    },
    () => {
      modelLoaded = true;
      setStatus("PoseNet ready");
      hideStatusSoon();
    }
  );
  poseNet.on("pose", (results) => {
    poses = results;
  });

  initRoomAndSync();
  lastSpawn = millis();
  lastSecondTick = millis();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
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
    gameType: "stars",
  });

  sync.on((msg) => {
    if (msg.type === "command") handleCommand(msg.action);
    if (msg.type === "hello" && msg.role === "tablet") sync.publish({ hostReady: true });
    if (msg.type === "state" && msg.from === "tablet" && msg.state) {
      if (msg.state.playerName) playerName = msg.state.playerName;
      // If tablet picked a different game, hop to the unified TV mode for it
      if (msg.state.gameType === "orbit" && gamePhase === "lobby") {
        const next = new URL(window.location.href);
        next.searchParams.set("mode", "orbit");
        next.searchParams.delete("autostart");
        window.location.replace(next.toString());
      }
    }
  });

  if (window.STELLA_TV_AUTOSTART) {
    setTimeout(() => {
      if (gamePhase === "lobby") startCountdown();
    }, 700);
  }

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
    gameType: "stars",
  });
}

function startCountdown() {
  stars = [];
  particles = [];
  trails = { left: [], right: [] };
  smoothHands = { left: null, right: null };
  score = 0;
  timeLeft = GAME_SECONDS;
  spawnInterval = 750;
  countdownValue = 3;
  countdownTick = millis();
  lastSpawn = millis();
  lastSecondTick = millis();
  setPhase("countdown");
}

function resetToLobby() {
  stars = [];
  particles = [];
  trails = { left: [], right: [] };
  smoothHands = { left: null, right: null };
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
  background(5, 6, 18);

  // Mirrored full-bleed feed — same coordinate space as PoseNet tracking
  push();
  translate(width, 0);
  scale(-1, 1);
  if (video) {
    tint(255, 160);
    image(video, 0, 0, width, height);
    noTint();
  }
  pop();

  drawVignette();

  if (gamePhase === "lobby") {
    if (!modelLoaded) {
      fill(255, 220);
      textAlign(CENTER, CENTER);
      textSize(22);
      text("Warming up camera & PoseNet…", width / 2, height - 48);
    }
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
    spawnStars();
    updateAndDrawStars();
    drawTrails();
    updateAndDrawParticles();
    checkSlashes();
    updateTimer();
    drawHUD();
    return;
  }

  if (gamePhase === "paused") {
    updateAndDrawStars(false);
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
    stroke(5, 6, 18, 30 + i * 18);
    strokeWeight(40);
    rect(20 + i * 8, 20 + i * 8, width - 40 - i * 16, height - 40 - i * 16, 24);
  }
  noStroke();
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

function findKeypoint(pose, partName) {
  return pose.pose.keypoints.find((k) => k.part === partName) || null;
}

function mapKeypointToCanvas(kp) {
  // PoseNet points are in video element space; rescale into canvas space so
  // tracking stays aligned after resizes / fullscreen on any TV size.
  const scaleX = width / Math.max(1, video.width);
  const scaleY = height / Math.max(1, video.height);
  return {
    x: width - kp.position.x * scaleX,
    y: kp.position.y * scaleY,
    score: kp.score,
  };
}

function getMirroredKeypoint(pose, partName, minScore = WRIST_MIN_SCORE) {
  const kp = findKeypoint(pose, partName);
  if (kp && kp.score > minScore) return mapKeypointToCanvas(kp);
  return null;
}

function estimateWrist(pose, side) {
  // Prefer a confident wrist; if far-away confidence dips, extend from the
  // shoulder→elbow ray so the slash tip still tracks the hand.
  const wrist = findKeypoint(pose, side + "Wrist");
  const elbow = findKeypoint(pose, side + "Elbow");
  const shoulder = findKeypoint(pose, side + "Shoulder");

  if (wrist && wrist.score >= WRIST_GOOD_SCORE) {
    return mapKeypointToCanvas(wrist);
  }

  if (wrist && wrist.score >= WRIST_MIN_SCORE && elbow && elbow.score > 0.2) {
    const w = mapKeypointToCanvas(wrist);
    const e = mapKeypointToCanvas(elbow);
    // Pull slightly toward the forearm tip to damp PoseNet wrist jitter
    return {
      x: lerp(e.x, w.x, 0.85),
      y: lerp(e.y, w.y, 0.85),
      score: wrist.score,
    };
  }

  if (elbow && shoulder && elbow.score > 0.22 && shoulder.score > 0.22) {
    const e = mapKeypointToCanvas(elbow);
    const s = mapKeypointToCanvas(shoulder);
    const reach = 0.9;
    return {
      x: e.x + (e.x - s.x) * reach,
      y: e.y + (e.y - s.y) * reach,
      score: Math.min(elbow.score, shoulder.score),
    };
  }

  if (wrist && wrist.score >= WRIST_MIN_SCORE) {
    return mapKeypointToCanvas(wrist);
  }
  return null;
}

function bodyCenterX(pose) {
  const ls = getMirroredKeypoint(pose, "leftShoulder", 0.1);
  const rs = getMirroredKeypoint(pose, "rightShoulder", 0.1);
  if (ls && rs) return (ls.x + rs.x) / 2;
  const nose = getMirroredKeypoint(pose, "nose", 0.1);
  return nose ? nose.x : width / 2;
}

function pickBestPose(results) {
  if (!results || results.length === 0) return null;
  let best = results[0];
  let bestScore = best.pose && best.pose.score != null ? best.pose.score : 0;
  for (let i = 1; i < results.length; i++) {
    const s = results[i].pose && results[i].pose.score != null ? results[i].pose.score : 0;
    if (s > bestScore) {
      best = results[i];
      bestScore = s;
    }
  }
  return best;
}

function resolveHands(pose) {
  let leftPt = estimateWrist(pose, "left");
  let rightPt = estimateWrist(pose, "right");

  // At distance PoseNet often swaps left/right labels. Re-assign by screen
  // side after mirroring so each trail stays on the correct side of the body.
  if (leftPt && rightPt && leftPt.x > rightPt.x) {
    const tmp = leftPt;
    leftPt = rightPt;
    rightPt = tmp;
  } else if (leftPt && !rightPt) {
    if (leftPt.x > bodyCenterX(pose)) {
      rightPt = leftPt;
      leftPt = null;
    }
  } else if (rightPt && !leftPt) {
    if (rightPt.x < bodyCenterX(pose)) {
      leftPt = rightPt;
      rightPt = null;
    }
  }

  return { leftPt, rightPt };
}

function smoothHand(side, pt) {
  if (!pt) {
    smoothHands[side] = null;
    return null;
  }
  if (!smoothHands[side]) {
    smoothHands[side] = { x: pt.x, y: pt.y };
    return { x: pt.x, y: pt.y };
  }
  smoothHands[side].x = lerp(smoothHands[side].x, pt.x, HAND_SMOOTH);
  smoothHands[side].y = lerp(smoothHands[side].y, pt.y, HAND_SMOOTH);
  return { x: smoothHands[side].x, y: smoothHands[side].y };
}

function updateHandTrails() {
  let leftPt = null;
  let rightPt = null;
  const pose = pickBestPose(poses);
  if (pose) {
    const hands = resolveHands(pose);
    leftPt = smoothHand("left", hands.leftPt);
    rightPt = smoothHand("right", hands.rightPt);
  } else {
    smoothHands.left = null;
    smoothHands.right = null;
  }
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
  drawSingleTrail(trails.left, color(80, 220, 255));
  drawSingleTrail(trails.right, color(255, 110, 200));
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

function spawnStars() {
  if (millis() - lastSpawn > spawnInterval) {
    lastSpawn = millis();
    const r = random(20, 36);
    stars.push({
      x: random(r + 20, width - r - 20),
      y: height + r + 10,
      r,
      vy: random(2.2, 4.2),
      vx: random(-0.6, 0.6),
      hue: random(360),
      rot: random(TWO_PI),
      rotSpeed: random(-0.02, 0.02),
      twinkle: random(1000),
    });
    spawnInterval = max(350, spawnInterval - 4);
  }
}

function updateAndDrawStars(move = true) {
  colorMode(HSB, 360, 100, 100, 255);
  for (let i = stars.length - 1; i >= 0; i--) {
    const c = stars[i];
    if (move) {
      c.y -= c.vy;
      c.x += c.vx;
      c.rot += c.rotSpeed;
    }
    if (c.y + c.r < -40) {
      stars.splice(i, 1);
      continue;
    }

    push();
    translate(c.x, c.y);
    rotate(c.rot);
    const pulse = 0.85 + 0.15 * sin(frameCount * 0.08 + c.twinkle);
    noStroke();
    fill(c.hue, 60, 100, 60);
    circle(0, 0, c.r * 2.6 * pulse);
    fill(c.hue, 75, 100, 235);
    drawStarShape(0, 0, c.r * 0.42, c.r, 5);
    fill(c.hue, 25, 100, 220);
    circle(0, 0, c.r * 0.35);
    pop();
  }
  colorMode(RGB, 255);
}

function drawStarShape(x, y, radiusInner, radiusOuter, npoints) {
  const angle = TWO_PI / npoints;
  const halfAngle = angle / 2.0;
  beginShape();
  for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
    vertex(x + cos(a) * radiusOuter, y + sin(a) * radiusOuter);
    vertex(x + cos(a + halfAngle) * radiusInner, y + sin(a + halfAngle) * radiusInner);
  }
  endShape(CLOSE);
}

function checkSlashes() {
  checkTrailAgainstStars(trails.left);
  checkTrailAgainstStars(trails.right);
}

function checkTrailAgainstStars(trail) {
  if (trail.length < 2) return;
  for (let i = stars.length - 1; i >= 0; i--) {
    const c = stars[i];
    for (let j = 1; j < trail.length; j++) {
      const d = distToSegment(c.x, c.y, trail[j - 1].x, trail[j - 1].y, trail[j].x, trail[j].y);
      if (d < c.r + HIT_RADIUS_PAD) {
        popStar(i);
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

function popStar(index) {
  const c = stars[index];
  spawnParticles(c.x, c.y, c.hue);
  stars.splice(index, 1);
  score += 1;
  if (score > bestScore) bestScore = score;
  publishGameState();
}

function spawnParticles(x, y, hue) {
  colorMode(HSB, 360, 100, 100, 255);
  for (let i = 0; i < 14; i++) {
    const angle = random(TWO_PI);
    const speed = random(2, 6);
    particles.push({
      x,
      y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      life: 255,
      hue,
    });
  }
  colorMode(RGB, 255);
}

function updateAndDrawParticles() {
  colorMode(HSB, 360, 100, 100, 255);
  noStroke();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
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
  noStroke();
  fill(20, 24, 48, 180);
  rect(pad, pad, 220, 64, 18);
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(14);
  text(playerName.toUpperCase(), pad + 18, pad + 22);
  textSize(28);
  textStyle(BOLD);
  text("✦ " + score, pad + 18, pad + 46);
  textStyle(NORMAL);

  fill(20, 24, 48, 180);
  rect(width - pad - 120, pad, 120, 64, 18);
  fill(timeLeft <= 5 ? "#ff7b7b" : "#ffffff");
  textAlign(CENTER, CENTER);
  textSize(28);
  textStyle(BOLD);
  text(String(timeLeft), width - pad - 60, pad + 34);
  textStyle(NORMAL);

  fill(255, 200);
  textAlign(CENTER, TOP);
  textSize(16);
  text("STELLA NOVA", width / 2, pad + 8);
}

function drawGameOver() {
  fill(5, 6, 18, 190);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  textStyle(BOLD);
  text("Nice work!", width / 2, height / 2 - 60);
  textStyle(NORMAL);
  textSize(28);
  text("Stars collected  " + score, width / 2, height / 2);
  textSize(18);
  fill(200);
  text("Best  " + bestScore + "   ·   Use the tablet to continue", width / 2, height / 2 + 48);
}

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
