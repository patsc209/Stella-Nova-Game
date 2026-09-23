/**
 * Stella Nova sync — works across devices via WebSocket.
 * Falls back to BroadcastChannel + localStorage for same-computer tabs.
 */
(function (global) {
  const STORAGE_PREFIX = "stella-nova:";
  const CHANNEL_PREFIX = "stella-nova-";

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

  function wsUrl() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return proto + "//" + location.host + "/sync";
  }

  function createSync(roomCode, role, onMessage) {
    const room = String(roomCode || "").toUpperCase();
    if (!room || room.length !== 4) {
      throw new Error("Room code must be 4 characters");
    }

    const listeners = [];
    let channel = null;
    let socket = null;
    let destroyed = false;
    let reconnectTimer = null;

    function emit(msg) {
      listeners.forEach((fn) => fn(msg));
      if (typeof onMessage === "function") onMessage(msg);
    }

    // Same-device fallback
    try {
      channel = new BroadcastChannel(CHANNEL_PREFIX + room);
      channel.onmessage = (event) => emit(event.data);
    } catch (_) {
      channel = null;
    }

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

    function connectSocket() {
      if (destroyed) return;
      try {
        socket = new WebSocket(wsUrl());
      } catch (_) {
        socket = null;
        return;
      }

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "join", room, role }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "joined" && msg.state) {
            saveState(room, msg.state);
          }
          if (msg.type === "state" && msg.state) {
            saveState(room, msg.state);
          }
          emit(msg);
        } catch (_) {
          /* ignore */
        }
      });

      socket.addEventListener("close", () => {
        socket = null;
        if (!destroyed) {
          reconnectTimer = setTimeout(connectSocket, 1200);
        }
      });

      socket.addEventListener("error", () => {
        /* close handler will reconnect */
      });
    }

    connectSocket();

    function wireSend(msg) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      }
      if (channel) {
        try {
          channel.postMessage(msg);
        } catch (_) {
          /* ignore */
        }
      }
    }

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
      const msg = { type: "state", from: role, room, state: next };
      wireSend(msg);
      return next;
    }

    function send(message) {
      const msg = Object.assign({ from: role, room }, message);
      wireSend(msg);
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
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        try {
          socket.close();
        } catch (_) {
          /* ignore */
        }
      }
      if (channel) {
        try {
          channel.close();
        } catch (_) {
          /* ignore */
        }
      }
    }

    // Announce presence (local + network once connected)
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
