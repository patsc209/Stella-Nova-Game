/**
 * Stella Nova — single TV entry.
 * Lobby waits for the tablet; on Play it loads Star Slash or Orbit Rally automatically.
 * A fresh visit or refresh mints a new code. A game switch keeps that code for one reload.
 */
(function () {
  const KEEP_KEY = "stella-nova:tv-session";
  const params = new URLSearchParams(window.location.search);
  const keep = sessionStorage.getItem(KEEP_KEY);
  sessionStorage.removeItem(KEEP_KEY);

  let mode = (params.get("mode") || "").toLowerCase();
  if (mode !== "stars" && mode !== "orbit") mode = "";

  const roomInUrl = params.get("room") || "";
  const switchingIn = keep && keep === roomInUrl && /^\d{4}$/.test(keep) && (mode === "stars" || mode === "orbit");

  let roomCode;
  if (switchingIn) {
    roomCode = keep;
  } else {
    roomCode = PlanetHockeySync.generateRoomCode();
    mode = "";
    const clean = new URL(window.location.href);
    clean.search = "";
    clean.searchParams.set("room", roomCode);
    history.replaceState(null, "", clean.pathname + "?" + clean.searchParams.toString());
  }

  const noteEl = document.getElementById("tv-game-note");
  const codeEl = document.getElementById("room-code-display");
  const statusEl = document.getElementById("status");

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.remove("hidden");
  }

  if (codeEl) codeEl.textContent = roomCode;
  if (noteEl) noteEl.textContent = "Enter this code on the tablet.";
  document.title = "Stella Nova — TV";

  function goMode(nextMode, { autostart } = {}) {
    sessionStorage.setItem(KEEP_KEY, roomCode);
    const next = new URL(window.location.href);
    next.searchParams.set("room", roomCode);
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

  if (mode === "stars" || mode === "orbit") {
    setStatus("Starting…");
    window.STELLA_TV_MODE = mode;
    window.STELLA_TV_AUTOSTART = params.get("autostart") === "1";
    loadGameScript(mode)
      .then(() => setStatus("Ready"))
      .catch(() => setStatus("Could not start"));
    return;
  }

  setStatus("Waiting for tablet…");
  const sync = PlanetHockeySync.createSync(roomCode, "game");
  sync.publish({
    phase: "lobby",
    score: 0,
    timeLeft: 20,
    hostReady: true,
    gameType: null,
    playMode: null,
    playerName: "TV",
  });

  let switching = false;
  let pendingGameType = null;

  function maybeSwitch(gt, fromPlay) {
    if (switching) return;
    if (gt !== "stars" && gt !== "orbit") gt = "stars";
    switching = true;
    setStatus("Starting…");
    goMode(gt, { autostart: !!fromPlay });
  }

  sync.on((msg) => {
    if (msg.type === "hello" && msg.role === "tablet") {
      sync.publish({ hostReady: true, phase: "lobby" });
    }
    if (msg.type === "state" && msg.from === "tablet" && msg.state) {
      if (msg.state.gameType === "stars" || msg.state.gameType === "orbit") {
        pendingGameType = msg.state.gameType;
      }
    }
    if (msg.type === "command" && msg.action === "play") {
      const state = sync.getState() || {};
      const gt = pendingGameType || state.gameType;
      if (gt !== "stars" && gt !== "orbit") return;
      maybeSwitch(gt, true);
    }
  });
})();
