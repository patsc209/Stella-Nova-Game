// Copyright (c) 2018 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
PoseNet example using p5.js
=== */

let video;
let poseNet;
let poses = [];

// ---- Game state ----
let circles = [];
let particles = [];
let trails = { left: [], right: [] };
let score = 0;
let timeLeft = 60;
let gameState = "playing"; // "playing" | "over"
let lastSpawn = 0;
let spawnInterval = 750;
let lastSecondTick = 0;

const TRAIL_MAX_LEN = 14;
const HIT_RADIUS_PAD = 12;

function setup() {
  // Canvas now fills the actual window/screen instead of a fixed 640x480 box.
  // This is the key fix: PoseNet's keypoints are returned in the coordinate
  // space of the video passed to it. If that space is much smaller than the
  // screen the canvas gets stretched to fill, a full arm reach on a big
  // screen only moves the keypoint a little in the tracked coordinate space,
  // so slashes near the edges don't register. Matching canvas size to the
  // window (and rescaling the video to match) keeps 1 screen pixel of arm
  // movement equal to 1 tracked pixel, on any screen size.
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  poseNet = ml5.poseNet(video, modelReady);
  poseNet.on('pose', function (results) {
    poses = results;
  });

  lastSpawn = millis();
  lastSecondTick = millis();
}

// Re-fit canvas and video whenever the window/screen size changes
// (e.g. going fullscreen, resizing a browser window, rotating a tablet).
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(width, height);
}

function modelReady() {
  console.log('Model loaded');
}

function draw() {
  background(5, 6, 18);

  // Mirrored video feed so movement feels natural
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(255, 160); // slightly dim the camera feed so stars pop against it
  image(video, 0, 0, width, height);
  noTint();
  pop();

  if (gameState === "playing") {
    updateHandTrails();
    spawnCircles();
    updateAndDrawCircles();
    drawTrails();
    updateAndDrawParticles();
    checkSlashes();
    updateTimer();
    drawHUD();
  } else {
    updateAndDrawParticles();
    drawGameOver();
  }
}

// ---- Hand tracking ----
function getMirroredKeypoint(pose, partName) {
  let kp = pose.pose.keypoints.find(k => k.part === partName);
  if (kp && kp.score > 0.2) {
    // PoseNet returns keypoints scaled to the video element's actual size
    // (video.width/video.height), which may briefly differ from the canvas
    // size right after a resize. Rescale into canvas coordinates so
    // tracking always matches what's drawn, however big the screen is.
    let scaleX = width / video.width;
    let scaleY = height / video.height;
    return { x: width - kp.position.x * scaleX, y: kp.position.y * scaleY };
  }
  return null;
}

function updateHandTrails() {
  let leftPt = null, rightPt = null;
  if (poses.length > 0) {
    leftPt = getMirroredKeypoint(poses[0], 'leftWrist');
    rightPt = getMirroredKeypoint(poses[0], 'rightWrist');
  }

  if (leftPt) {
    trails.left.push(leftPt);
    if (trails.left.length > TRAIL_MAX_LEN) trails.left.shift();
  } else if (trails.left.length > 0) {
    trails.left.shift();
  }

  if (rightPt) {
    trails.right.push(rightPt);
    if (trails.right.length > TRAIL_MAX_LEN) trails.right.shift();
  } else if (trails.right.length > 0) {
    trails.right.shift();
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
      fill(col);
      circle(trail[0].x, trail[0].y, 16);
    }
    return;
  }
  noFill();
  for (let i = 1; i < trail.length; i++) {
    let a = map(i, 0, trail.length - 1, 30, 255);
    let w = map(i, 0, trail.length - 1, 2, 14);
    stroke(red(col), green(col), blue(col), a);
    strokeWeight(w);
    line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
  }
  let tip = trail[trail.length - 1];
  noStroke();
  fill(red(col), green(col), blue(col), 200);
  circle(tip.x, tip.y, 20);
}

// ---- Stars (targets) ----
function spawnCircles() {
  if (millis() - lastSpawn > spawnInterval) {
    lastSpawn = millis();
    let r = random(20, 36);
    circles.push({
      x: random(r, width - r),
      y: height + r,
      r: r,
      vy: random(2.2, 4.2),
      vx: random(-0.6, 0.6),
      hue: random(360),
      rot: random(TWO_PI),
      rotSpeed: random(-0.02, 0.02),
      twinkle: random(1000), // seeds the pulsing glow
      hit: false
    });
    spawnInterval = max(350, spawnInterval - 4);
  }
}

function updateAndDrawCircles() {
  colorMode(HSB, 360, 100, 100, 255);
  for (let i = circles.length - 1; i >= 0; i--) {
    let c = circles[i];
    c.y -= c.vy;
    c.x += c.vx;
    c.rot += c.rotSpeed;

    if (c.y + c.r < 0) {
      circles.splice(i, 1);
      continue;
    }

    push();
    translate(c.x, c.y);
    rotate(c.rot);

    // soft glow halo behind the star
    let pulse = 0.85 + 0.15 * sin(frameCount * 0.08 + c.twinkle);
    noStroke();
    fill(c.hue, 60, 100, 60);
    circle(0, 0, c.r * 2.6 * pulse);

    // the star itself
    fill(c.hue, 75, 100, 235);
    star(0, 0, c.r * 0.42, c.r, 5);

    // small bright core for extra sparkle
    fill(c.hue, 25, 100, 220);
    circle(0, 0, c.r * 0.35);

    pop();
  }
  colorMode(RGB, 255);
}

// classic 5-point star, drawn centered at (0,0)
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

// ---- Collision / slashing ----
function checkSlashes() {
  checkTrailAgainstCircles(trails.left);
  checkTrailAgainstCircles(trails.right);
}

function checkTrailAgainstCircles(trail) {
  if (trail.length < 2) return;
  for (let i = circles.length - 1; i >= 0; i--) {
    let c = circles[i];
    for (let j = 1; j < trail.length; j++) {
      let d = distToSegment(c.x, c.y, trail[j - 1].x, trail[j - 1].y, trail[j].x, trail[j].y);
      if (d < c.r + HIT_RADIUS_PAD) {
        popCircle(i);
        break;
      }
    }
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  let dx = x2 - x1, dy = y2 - y1;
  let lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = constrain(t, 0, 1);
  let projX = x1 + t * dx;
  let projY = y1 + t * dy;
  return dist(px, py, projX, projY);
}

function popCircle(index) {
  let c = circles[index];
  spawnParticles(c.x, c.y, c.hue);
  circles.splice(index, 1);
  score += 1;
}

// ---- Particles ----
function spawnParticles(x, y, hue) {
  colorMode(HSB, 360, 100, 100, 255);
  for (let i = 0; i < 14; i++) {
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

// ---- HUD / timer / game over ----
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

function drawHUD() {
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, 0, width, 50);
  fill(255);
  textSize(22);
  textAlign(LEFT, CENTER);
  text("⭐ " + score, 16, 26);
  textAlign(RIGHT, CENTER);
  text("Time: " + timeLeft, width - 16, 26);
}

function drawGameOver() {
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(36);
  text("Time's up!", width / 2, height / 2 - 40);
  textSize(24);
  text("Stars collected: " + score, width / 2, height / 2 + 4);
  textSize(16);
  fill(200);
  text("Press R to play again", width / 2, height / 2 + 44);
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    restartGame();
  }
}

function restartGame() {
  circles = [];
  particles = [];
  trails = { left: [], right: [] };
  score = 0;
  timeLeft = 60;
  spawnInterval = 750;
  lastSpawn = millis();
  lastSecondTick = millis();
  gameState = "playing";
}