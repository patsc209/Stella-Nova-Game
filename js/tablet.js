/* Planet Hockey — tablet companion controller */

(function () {
  const screens = {
    home: document.getElementById("screen-home"),
    connect: document.getElementById("screen-connect"),
    live: document.getElementById("screen-live"),
    paused: document.getElementById("screen-paused"),
    results: document.getElementById("screen-results"),
  };

  const connDot = document.getElementById("conn-dot");
  const connLabel = document.getElementById("conn-label");
  const connectError = document.getElementById("connect-error");
  const nameInput = document.getElementById("player-name");
  const roomInputs = Array.from(document.querySelectorAll("#room-inputs input"));

  const liveTitle = document.getElementById("live-title");
  const liveScore = document.getElementById("live-score");
  const liveTimer = document.getElementById("live-timer");
  const resultsScore = document.getElementById("results-score");
  const resultsMeta = document.getElementById("results-meta");
  const resultsBlurb = document.getElementById("results-blurb");

  let sync = null;
  let room = "";
  let lastPhase = "lobby";

  const savedName = localStorage.getItem("ph-player-name");
  if (savedName) nameInput.value = savedName;

  // Prefill room from URL if present
  const params = new URLSearchParams(window.location.search);
  const urlRoom = (params.get("room") || "").toUpperCase();
  if (urlRoom.length === 4) {
    urlRoom.split("").forEach((ch, i) => {
      if (roomInputs[i]) roomInputs[i].value = ch;
    });
  }

  function showScreen(name) {
    Object.keys(screens).forEach((key) => {
      screens[key].classList.toggle("active", key === name);
    });
  }

  function setConnected(ok, label) {
    connDot.classList.toggle("ok", !!ok);
    connLabel.textContent = label;
  }

  function getRoomFromInputs() {
    return roomInputs
      .map((el) => el.value.trim().toUpperCase())
      .join("");
  }

  function wireRoomInputs() {
    roomInputs.forEach((input, index) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase();
        connectError.textContent = "";
        if (input.value && index < roomInputs.length - 1) {
          roomInputs[index + 1].focus();
        }
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) {
          roomInputs[index - 1].focus();
        }
      });
      input.addEventListener("paste", (e) => {
        const text = (e.clipboardData || window.clipboardData).getData("text") || "";
        const cleaned = text.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 4);
        if (!cleaned) return;
        e.preventDefault();
        cleaned.split("").forEach((ch, i) => {
          if (roomInputs[i]) roomInputs[i].value = ch;
        });
        roomInputs[Math.min(cleaned.length, 3)].focus();
      });
    });
  }

  function applyState(state) {
    if (!state) return;
    lastPhase = state.phase || lastPhase;
    const score = state.score || 0;
    const timeLeft = typeof state.timeLeft === "number" ? state.timeLeft : 30;
    const best = state.bestScore || 0;

    liveScore.textContent = String(score);
    liveTimer.textContent = timeLeft + "s left";
    resultsScore.textContent = String(score);
    resultsMeta.textContent = "Your best: " + best;

    if (score > 0 && best > 0 && score >= best) {
      resultsBlurb.textContent = "New personal best — keep that arm swing going!";
    } else {
      resultsBlurb.textContent = "Session complete — great upper-body effort.";
    }

    if (state.phase === "countdown") {
      showScreen("live");
      liveTitle.textContent = "Get ready… " + (state.countdown || 3);
      setConnected(true, "Room " + room);
    } else if (state.phase === "playing") {
      showScreen("live");
      liveTitle.textContent = "You’re playing on TV. Look up and play!";
      setConnected(true, "Live · " + room);
    } else if (state.phase === "paused") {
      showScreen("paused");
      setConnected(true, "Paused · " + room);
    } else if (state.phase === "over") {
      showScreen("results");
      setConnected(true, "Done · " + room);
    } else if (state.phase === "lobby") {
      setConnected(!!state.hostReady, state.hostReady ? "TV ready · " + room : "Waiting for TV…");
    }
  }

  function connectAndPlay() {
    const code = getRoomFromInputs();
    const name = (nameInput.value || "Player").trim().slice(0, 16) || "Player";
    connectError.textContent = "";

    if (code.length !== 4) {
      connectError.textContent = "Enter the full 4-character room code from the TV tab.";
      return;
    }

    localStorage.setItem("ph-player-name", name);

    if (sync) {
      sync.destroy();
      sync = null;
    }

    room = code;
    try {
      sync = PlanetHockeySync.createSync(room, "tablet");
    } catch (err) {
      connectError.textContent = err.message;
      return;
    }

    const existing = sync.getState();
    if (!existing || !existing.hostReady) {
      // Still allow join — TV might publish a moment later
      setConnected(false, "Looking for TV…");
    } else {
      setConnected(true, "Connected · " + room);
    }

    sync.publish({
      tabletReady: true,
      playerName: name,
    });

    sync.on((msg) => {
      if (msg.type === "state" && msg.state) {
        applyState(msg.state);
      }
      if (msg.type === "hello" && msg.role === "game") {
        setConnected(true, "TV ready · " + room);
      }
    });

    // Kick off the match
    sync.send({ type: "command", action: "play" });
    showScreen("live");
    liveTitle.textContent = "Starting…";
    applyState(sync.getState());

    // Update URL for refresh convenience
    const next = new URL(window.location.href);
    next.searchParams.set("room", room);
    history.replaceState(null, "", next.toString());
  }

  function sendCommand(action) {
    if (!sync) return;
    sync.send({ type: "command", action });
  }

  document.getElementById("btn-go-connect").addEventListener("click", () => {
    showScreen("connect");
    roomInputs[0].focus();
  });

  document.getElementById("btn-back-home").addEventListener("click", () => {
    showScreen("home");
  });

  document.getElementById("btn-connect").addEventListener("click", connectAndPlay);

  document.getElementById("btn-pause").addEventListener("click", () => {
    sendCommand("pause");
    showScreen("paused");
  });

  document.getElementById("btn-resume").addEventListener("click", () => {
    sendCommand("resume");
    showScreen("live");
  });

  document.getElementById("btn-play-again").addEventListener("click", () => {
    sendCommand("restart");
    showScreen("live");
    liveTitle.textContent = "Starting…";
  });

  document.getElementById("btn-results-home").addEventListener("click", () => {
    sendCommand("home");
    showScreen("home");
    setConnected(!!sync, sync ? "Connected · " + room : "Not connected");
  });

  wireRoomInputs();

  // If room already in URL and TV state exists, soft-reconnect UI
  if (urlRoom.length === 4) {
    const existing = PlanetHockeySync.loadState(urlRoom);
    if (existing && existing.hostReady) {
      setConnected(true, "TV found · " + urlRoom);
    }
  }
})();
