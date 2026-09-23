// Copyright (c) 2018 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
PoseNet (multi-pose) example using p5.js
Orbit Hockey — timed 2-player air-hockey match
=== */

let video;
let poseNet;
let poses = [];

// ---- Match settings ----
const MATCH_SECONDS = 90;
const PADDLE_R = 42;
const PUCK_R = 15;
const CONFIDENCE = 0.2;

// ---- Tracking smoothing ----
const SMOOTHING = 0.25;       // lower = smoother but more lag between hand and paddle
const HISTORY_LEN = 6;        // frames averaged to cut down PoseNet jitter
const HAND_SWITCH_MARGIN = 0.15;  // how much more confident the other wrist must be
const HAND_SWITCH_FRAMES = 8;     // ...for that many consecutive frames before we swap

// ---- Onboarding timings ----
const ONBOARD_INTRO_MS = 3500;
const ONBOARD_DEMO_MS = 4800;   // split evenly across up/down/left/right
const COUNTDOWN_STEP_MS = 900;  // 3, 2, 1, START!

// ---- Game state ----
let paddleA = { x: 160, y: 240, history: [], lockedHand: null, switchCounter: 0 }; // left half — Player A
let paddleB = { x: 480, y: 240, history: [], lockedHand: null, switchCounter: 0 }; // right half — Player B (or AI)
let puck = { x: 320, y: 240, vx: 4, vy: 3 };
let particles = [];

let scoreA = 0;
let scoreB = 0;
let timeLeft = MATCH_SECONDS;
let gameState = "intro"; // "intro" -> "demo" -> "countdown" -> "playing" -> "over"
let stateStartTime = 0;
let lastSecondTick = 0;
let flashText = "";
let flashTimer = 0;

function setup() {
  // Canvas fills the actual window/screen instead of a fixed 640x480 box, so
  // the tracked coordinate space always matches the physical screen size —
  // otherwise a full arm reach on a big screen only moves the paddle a
  // little, since PoseNet's keypoints stay confined to the old small space.
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // detectionType: 'multiple' lets PoseNet track both players from one webcam
  poseNet = ml5.poseNet(video, { detectionType: 'multiple', maxPoseDetections: 2 }, modelReady);
  poseNet.on('pose', function (results) {
    poses = results;
  });

  // Start paddles at sensible positions for whatever size the canvas actually is,
  // rather than the old fixed 160/480 values.
  paddleA.x = width * 0.25;
  paddleA.y = height / 2;
  paddleB.x = width * 0.75;
  paddleB.y = height / 2;

  resetPuck();
  lastSecondTick = millis();
  stateStartTime = millis();
}

// Re-fit canvas and video whenever the window/screen size changes
// (fullscreen toggle, browser resize, tablet rotation, etc).
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(width, height);
}

function modelReady() {
  console.log('Model loaded');
}

function draw() {
  background(5, 6, 18);

  // Mirrored, dimmed video feed — always visible so players can see themselves,
  // including during onboarding
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(255, 140);
  image(video, 0, 0, width, height);
  noTint();
  pop();

  if (gameState === "intro") {
    drawIntro();
    if (millis() - stateStartTime > ONBOARD_INTRO_MS) {
      gameState = "demo";
      stateStartTime = millis();
    }
    return;
  }

  if (gameState === "demo") {
    drawDemo();
    if (millis() - stateStartTime > ONBOARD_DEMO_MS) {
      gameState = "countdown";
      stateStartTime = millis();
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
  text("Each player controls the alien on their own side", width / 2, 105);

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
function getMirroredKeypoint(pose, partName) {
  let kp = pose.pose.keypoints.find(k => k.part === partName);
  if (kp && kp.score > CONFIDENCE) {
    // Rescale from the video element's own size into canvas coordinates —
    // these can briefly differ right after a resize, and on a screen much
    // bigger than the video's native capture size this is what keeps a full
    // arm reach mapping to a full reach across the canvas.
    let scaleX = width / video.width;
    let scaleY = height / video.height;
    return { x: width - kp.position.x * scaleX, y: kp.position.y * scaleY };
  }
  return null;
}

function getHandPoint(pose, paddle) {
  // Locks onto one wrist per player instead of re-picking every frame —
  // re-picking on marginal confidence differences is what causes paddle "jumps".
  let rw = pose.pose.keypoints.find(k => k.part === 'rightWrist');
  let lw = pose.pose.keypoints.find(k => k.part === 'leftWrist');
  let rConf = rw ? rw.score : 0;
  let lConf = lw ? lw.score : 0;

  if (!paddle.lockedHand) {
    paddle.lockedHand = rConf >= lConf ? 'right' : 'left';
  }

  let currentConf = paddle.lockedHand === 'right' ? rConf : lConf;
  let otherConf = paddle.lockedHand === 'right' ? lConf : rConf;

  if (otherConf > currentConf + HAND_SWITCH_MARGIN) {
    paddle.switchCounter++;
    if (paddle.switchCounter > HAND_SWITCH_FRAMES) {
      paddle.lockedHand = paddle.lockedHand === 'right' ? 'left' : 'right';
      paddle.switchCounter = 0;
    }
  } else {
    paddle.switchCounter = 0;
  }

  // Same video-to-canvas rescale as getMirroredKeypoint, applied to whichever
  // wrist is currently locked in (and to the fallback wrist below).
  let scaleX = width / video.width;
  let scaleY = height / video.height;

  let kp = paddle.lockedHand === 'right' ? rw : lw;
  if (kp && kp.score > CONFIDENCE) {
    return { x: width - kp.position.x * scaleX, y: kp.position.y * scaleY };
  }

  // locked hand briefly lost — fall back to the other one rather than freezing
  let altKp = paddle.lockedHand === 'right' ? lw : rw;
  if (altKp && altKp.score > CONFIDENCE) {
    return { x: width - altKp.position.x * scaleX, y: altKp.position.y * scaleY };
  }
  return null;
}

function smoothPoint(paddle, rawPoint) {
  paddle.history.push(rawPoint);
  if (paddle.history.length > HISTORY_LEN) paddle.history.shift();
  let avgX = paddle.history.reduce((sum, p) => sum + p.x, 0) / paddle.history.length;
  let avgY = paddle.history.reduce((sum, p) => sum + p.y, 0) / paddle.history.length;
  return { x: avgX, y: avgY };
}

function updatePaddles() {
  // Sort by MIRRORED nose x (width - raw x) so the sort matches what's actually
  // on screen — sorting on raw video x would put the physically-right-side
  // player on the left paddle, since the video itself is drawn mirrored.
  let sorted = [...poses].sort((p1, p2) => {
    let n1 = p1.pose.keypoints.find(k => k.part === 'nose');
    let n2 = p2.pose.keypoints.find(k => k.part === 'nose');
    let x1 = n1 ? width - n1.position.x : 0;
    let x2 = n2 ? width - n2.position.x : 0;
    return x1 - x2;
  });

  // sorted[0] is now genuinely the person appearing on the LEFT of the mirrored
  // video, so they always drive paddleA (left half); sorted[1] -> paddleB (right half)
  if (sorted.length >= 1) {
    let hand = getHandPoint(sorted[0], paddleA);
    if (hand) {
      let smoothed = smoothPoint(paddleA, hand);
      paddleA.x = lerp(paddleA.x, constrain(smoothed.x, PADDLE_R, width / 2 - PADDLE_R), SMOOTHING);
      paddleA.y = lerp(paddleA.y, constrain(smoothed.y, PADDLE_R, height - PADDLE_R), SMOOTHING);
    }
  }

  if (sorted.length >= 2) {
    let hand = getHandPoint(sorted[1], paddleB);
    if (hand) {
      let smoothed = smoothPoint(paddleB, hand);
      paddleB.x = lerp(paddleB.x, constrain(smoothed.x, width / 2 + PADDLE_R, width - PADDLE_R), SMOOTHING);
      paddleB.y = lerp(paddleB.y, constrain(smoothed.y, PADDLE_R, height - PADDLE_R), SMOOTHING);
    }
  } else {
    // gentle AI stand-in for Player B when only one person is detected
    paddleB.x = lerp(paddleB.x, width - 90, 0.03);
    paddleB.y = lerp(paddleB.y, puck.y, 0.035);
    paddleB.y = constrain(paddleB.y, PADDLE_R, height - PADDLE_R);
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
  if (scorer === 'A') {
    scoreA += 1;
    flash('Player A scores!');
  } else {
    scoreB += 1;
    flash('Player B scores!');
  }
  spawnParticles(puck.x, puck.y, scorer === 'A' ? 200 : 320);
  resetPuck();
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
    if (timeLeft <= 0) {
      timeLeft = 0;
      gameState = "over";
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
  text(poses.length < 2 ? "Player B: AI" : "Player B: live", width - 16, 26);
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
  if (key === 'r' || key === 'R') {
    restartMatch();
  }
  if (key === 'o' || key === 'O') {
    // replay onboarding on demand
    gameState = "intro";
    stateStartTime = millis();
  }
}

function restartMatch() {
  scoreA = 0;
  scoreB = 0;
  timeLeft = MATCH_SECONDS;
  gameState = "playing"; // quick rematch skips onboarding — press O to see it again
  particles = [];
  resetPuck();
  lastSecondTick = millis();
}