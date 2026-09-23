/**
 * Planet Hockey — same-computer tab sync via BroadcastChannel + localStorage.
 * Room codes let the tablet and TV screens stay in lockstep.
 */
(function (global) {
  const STORAGE_PREFIX = "planet-hockey:";
  const CHANNEL_PREFIX = "planet-hockey-";

  function storageKey(room) {
    return STORAGE_PREFIX + room.toUpperCase();
  }

  function loadState(room) {
    try {
      const raw = localStorage.getItem(storageKey(room));
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveState(room, state) {
    const payload = Object.assign({}, state, { updatedAt: Date.now() });
    localStorage.setItem(storageKey(room), JSON.stringify(payload));
    return payload;
  }

  function generateRoomCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }

  function createSync(roomCode, role, onMessage) {
    const room = String(roomCode || "").toUpperCase();
    if (!room || room.length !== 4) {
      throw new Error("Room code must be 4 characters");
    }

    const channel = new BroadcastChannel(CHANNEL_PREFIX + room);
    const listeners = [];

    function emit(msg) {
      listeners.forEach((fn) => fn(msg));
      if (typeof onMessage === "function") onMessage(msg);
    }

    channel.onmessage = (event) => {
      emit(event.data);
    };

    window.addEventListener("storage", (event) => {
      if (event.key === storageKey(room) && event.newValue) {
        try {
          const state = JSON.parse(event.newValue);
          emit({ type: "state", from: "storage", state });
        } catch (_) {
          /* ignore */
        }
      }
    });

    function publish(partialState) {
      const current = loadState(room) || {
        room,
        phase: "lobby",
        score: 0,
        timeLeft: 30,
        bestScore: 0,
        playerName: "Player",
        hostReady: false,
        tabletReady: false,
      };
      const next = saveState(room, Object.assign({}, current, partialState, { room }));
      const msg = { type: "state", from: role, state: next };
      channel.postMessage(msg);
      return next;
    }

    function send(message) {
      const msg = Object.assign({ from: role, room }, message);
      channel.postMessage(msg);
      return msg;
    }

    function getState() {
      return loadState(room);
    }

    function on(fn) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    }

    function destroy() {
      channel.close();
    }

    // Announce presence
    send({ type: "hello", role });

    return {
      room,
      role,
      publish,
      send,
      getState,
      on,
      destroy,
      loadState: () => loadState(room),
    };
  }

  global.PlanetHockeySync = {
    createSync,
    generateRoomCode,
    loadState,
    saveState,
    storageKey,
  };
})(window);
