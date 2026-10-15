/**
 * Stella Nova — single TV entry.
 * Lobby waits for the tablet; on Play it loads Star Slash or Orbit Rally automatically.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  let mode = (params.get("mode") || "").toLowerCase();
  if (mode !== "stars" && mode !== "orbit") mode = "";

  const titleEl = document.getElementById("tv-game-title");
  const noteEl = document.getElementById("tv-game-note");
  const codeEl = document.getElementById("room-code-display");
  const statusEl = document.getElementById("status");

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.remove("hidden");
  }

  function updateCopy(m) {
    if (!titleEl) return;
    if (m === "orbit") {
      titleEl.textContent = "Orbit Rally";
      if (noteEl) {
        noteEl.innerHTML =
          "Tablet selected <strong>Orbit Rally</strong>. Solo uses an AI opponent · multiplayer needs two people in frame.<br/>Demo keys: <strong>P</strong> start · <strong>Space</strong> pause · <strong>R</strong> restart";
      }
      document.title = "Stella Nova — Orbit Rally";
    } else if (m === "stars") {
      titleEl.textContent = "Star Slash";
      if (noteEl) {
        noteEl.innerHTML =
          "Tablet selected <strong>Star Slash</strong> (Sun). Slash rising stars with either fingertip.<br/>Demo keys: <strong>P</strong> start · <strong>Space</strong> pause · <strong>R</strong> restart";
      }
      document.title = "Stella Nova — Star Slash";
    } else {
      titleEl.textContent = "Stella Nova";
      if (noteEl) {
        noteEl.innerHTML =
          "Open the tablet, pick a planet, then enter this room code. This screen switches games automatically.<br/>Waiting for tablet…";
      }
      document.title = "Stella Nova — TV";
    }
  }

  function goMode(nextMode, { autostart } = {}) {
    const next = new URL(window.location.href);
    next.searchParams.set("mode", nextMode);
    if (autostart) next.searchParams.set("autostart", "1");
    else next.searchParams.delete("autostart");
    window.location.replace(next.toString());
  }

  function loadGameScript(m) {
    const src = m === "orbit" ? "js/orbit.js" : "js/game.js";
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  let roomCode = (params.get("room") || "").toUpperCase();
  if (!roomCode || roomCode.length !== 4) {
    roomCode = PlanetHockeySync.generateRoomCode();
    params.set("room", roomCode);
    history.replaceState(null, "", "?" + params.toString());
  }
  if (codeEl) codeEl.textContent = roomCode;

  updateCopy(mode);

  if (mode === "stars" || mode === "orbit") {
    setStatus("Loading " + (mode === "orbit" ? "Orbit Rally" : "Star Slash") + "…");
    window.STELLA_TV_MODE = mode;
    window.STELLA_TV_AUTOSTART = params.get("autostart") === "1";
    loadGameScript(mode)
      .then(() => setStatus((mode === "orbit" ? "Orbit Rally" : "Star Slash") + " ready"))
      .catch(() => setStatus("Failed to load game script"));
    return;
  }

  setStatus("TV hub ready — waiting for tablet…");
  const sync = PlanetHockeySync.createSync(roomCode, "game");
  sync.publish({
    phase: "lobby",
    score: 0,
    timeLeft: 30,
    hostReady: true,
    gameType: null,
    playerName: "TV",
  });

  let switching = false;
  let pendingGameType = null;

  function maybeSwitch(gt, fromPlay) {
    if (switching) return;
    if (gt !== "stars" && gt !== "orbit") gt = "stars";
    switching = true;
    setStatus("Switching to " + (gt === "orbit" ? "Orbit Rally" : "Star Slash") + "…");
    goMode(gt, { autostart: !!fromPlay });
  }

  sync.on((msg) => {
    if (msg.type === "hello" && msg.role === "tablet") {
      sync.publish({ hostReady: true, phase: "lobby" });
    }
    if (msg.type === "state" && msg.state) {
      if (msg.state.gameType === "stars" || msg.state.gameType === "orbit") {
        pendingGameType = msg.state.gameType;
        updateCopy(msg.state.gameType);
      }
    }
    if (msg.type === "command" && msg.action === "play") {
      const state = sync.getState() || {};
      maybeSwitch(pendingGameType || state.gameType || "stars", true);
    }
  });
})();
