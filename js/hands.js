/**
 * Hand tracking for the TV games.
 * Same MediaPipe Hand Landmarker setup as
 * https://github.com/jesishen/my-magical-wands (lib/hands.ts):
 * GPU model from Google's CDN, two hands, fingertip landmark 8.
 *
 * Points come back mirrored into the p5 canvas so they sit on the
 * full-bleed video the games already draw.
 */
(function () {
  const VISION_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";
  const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
  const MODEL_PATH =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

  const INDEX_TIP = 8;
  const HAND_WRIST = 0;
  const POSE_MODEL_PATH =
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
  // BlazePose indices used to tell two people apart and to fall back
  // when the hand model hasn't locked onto someone yet.
  const NOSE = 0;
  const L_SHOULDER = 11;
  const R_SHOULDER = 12;
  const L_WRIST = 15;
  const R_WRIST = 16;
  const L_INDEX = 19;
  const R_INDEX = 20;

  // Width hint only — a width+height pair makes some cameras crop (the
  // "phone zoom" magical wands ran into).
  const cameraConstraints = {
    video: {
      facingMode: "user",
      width: { ideal: 1920 },
    },
    audio: false,
  };

  async function loadVision() {
    return import(VISION_URL);
  }

  async function createLandmarker(vision, fileset, delegate, numHands) {
    return vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: delegate,
      },
      runningMode: "VIDEO",
      numHands: numHands,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  async function createPoseLandmarker(vision, fileset, delegate) {
    return vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: POSE_MODEL_PATH,
        delegate: delegate,
      },
      runningMode: "VIDEO",
      numPoses: 2,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
  }

  async function withDelegate(create, label) {
    try {
      return await create("GPU");
    } catch (gpuErr) {
      console.warn(label + " GPU delegate failed, using CPU", gpuErr);
      return create("CPU");
    }
  }

  function hypot(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function mirrorPoint(nx, ny, viewW, viewH) {
    return { x: (1 - nx) * viewW, y: ny * viewH };
  }

  function posePoint(lm, viewW, viewH, minVis) {
    if (!lm) return null;
    const vis = lm.visibility == null ? 1 : lm.visibility;
    if (vis < minVis) return null;
    const p = mirrorPoint(lm.x, lm.y, viewW, viewH);
    p.v = vis;
    return p;
  }

  /**
   * Turn pose bodies + hand landmarks into people, left to right on the
   * mirrored screen. A second hand on the same person stays with that
   * person. Someone with no hand lock still gets their pose fingertip.
   */
  function assignPeople(poseList, handList, viewW, viewH) {
    const people = [];
    (poseList || []).forEach(function (lm) {
      if (!lm || lm.length < 21) return;
      const ls = posePoint(lm[L_SHOULDER], viewW, viewH, 0.3);
      const rs = posePoint(lm[R_SHOULDER], viewW, viewH, 0.3);
      const nose = posePoint(lm[NOSE], viewW, viewH, 0.3);
      let center = null;
      let shoulderW = viewW * 0.18;
      if (ls && rs) {
        center = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
        shoulderW = Math.max(hypot(ls, rs), viewW * 0.08);
      } else if (nose) {
        center = nose;
      } else if (ls || rs) {
        center = ls || rs;
      }
      if (!center) return;
      people.push({
        center: center,
        shoulderW: shoulderW,
        wrists: [posePoint(lm[L_WRIST], viewW, viewH, 0.2), posePoint(lm[R_WRIST], viewW, viewH, 0.2)].filter(Boolean),
        indexes: [posePoint(lm[L_INDEX], viewW, viewH, 0.2), posePoint(lm[R_INDEX], viewW, viewH, 0.2)].filter(Boolean),
        hands: [],
      });
    });

    const hands = (handList || [])
      .map(function (lm) {
        if (!lm || !lm[HAND_WRIST] || !lm[INDEX_TIP]) return null;
        return {
          wrist: mirrorPoint(lm[HAND_WRIST].x, lm[HAND_WRIST].y, viewW, viewH),
          tip: mirrorPoint(lm[INDEX_TIP].x, lm[INDEX_TIP].y, viewW, viewH),
        };
      })
      .filter(Boolean);

    hands.forEach(function (hand) {
      let best = null;
      let bestD = Infinity;
      people.forEach(function (person) {
        const anchors = person.wrists.length ? person.wrists : [person.center];
        anchors.forEach(function (anchor) {
          const d = hypot(hand.wrist, anchor);
          if (d < bestD) {
            bestD = d;
            best = person;
          }
        });
      });
      if (!best) return;
      const limit = Math.max(best.shoulderW * 2.8, viewW * 0.22);
      if (bestD <= limit) best.hands.push(hand);
    });

    const out = [];
    people.forEach(function (person) {
      let tip = null;
      if (person.hands.length) {
        person.hands.sort(function (a, b) {
          return hypot(b.tip, person.center) - hypot(a.tip, person.center);
        });
        tip = person.hands[0].tip;
      } else if (person.indexes.length) {
        person.indexes.sort(function (a, b) {
          return (b.v || 0) - (a.v || 0);
        });
        tip = person.indexes[0];
      } else if (person.wrists.length) {
        person.wrists.sort(function (a, b) {
          return (b.v || 0) - (a.v || 0);
        });
        tip = person.wrists[0];
      }
      if (!tip) return;
      out.push({
        x: person.center.x,
        y: person.center.y,
        tip: { x: tip.x, y: tip.y },
      });
    });
    out.sort(function (a, b) {
      return a.x - b.x;
    });
    return out;
  }

  function attach(videoEl, options) {
    const trackPeople = !!(options && options.people);
    const numHands = trackPeople ? 4 : 2;
    let landmarker = null;
    let poseLandmarker = null;
    let lastVideoTime = -1;
    let tips = [];
    let people = [];
    let failed = false;

    const ready = (async () => {
      const vision = await loadVision();
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_PATH);
      landmarker = await withDelegate(function (delegate) {
        return createLandmarker(vision, fileset, delegate, numHands);
      }, "Hand tracking");
      if (trackPeople) {
        poseLandmarker = await withDelegate(function (delegate) {
          return createPoseLandmarker(vision, fileset, delegate);
        }, "Person tracking");
      }
    })();

    function toCanvas(nx, ny) {
      return mirrorPoint(nx, ny, width, height);
    }

    const api = {
      ready: ready,
      people: people,
      update: update,
    };

    function update() {
      if (!landmarker || !videoEl || videoEl.readyState < 2) return tips;
      if (videoEl.currentTime === lastVideoTime) return tips;
      lastVideoTime = videoEl.currentTime;
      const now = performance.now();
      try {
        const hands = landmarker.detectForVideo(videoEl, now).landmarks || [];
        let poses = [];
        if (poseLandmarker) {
          poses = poseLandmarker.detectForVideo(videoEl, now).landmarks || [];
          people = assignPeople(poses, hands, width, height);
          api.people = people;
        }
        tips = hands
          .map(function (lm) {
            return toCanvas(lm[INDEX_TIP].x, lm[INDEX_TIP].y);
          })
          .sort(function (a, b) {
            return a.x - b.x;
          });
        failed = false;
      } catch (err) {
        if (!failed) {
          console.error("Hand tracking frame failed", err);
          failed = true;
        }
      }
      return tips;
    }

    return api;
  }

  window.StellaHands = {
    INDEX_TIP: INDEX_TIP,
    cameraConstraints: cameraConstraints,
    assignPeople: assignPeople,
    attach: attach,
  };
})();
