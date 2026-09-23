/**
 * Stella Nova — static file server + WebSocket room relay
 * Serves the prototype and syncs TV ↔ tablet across devices.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".zip": "application/zip",
};

const rooms = new Map(); // room -> { state, clients: Set<ws> }

function getRoom(code) {
  const room = String(code || "").toUpperCase();
  if (!rooms.has(room)) {
    rooms.set(room, { state: null, clients: new Set() });
  }
  return rooms.get(room);
}

function safeSend(ws, obj) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcast(roomCode, obj, except) {
  const room = getRoom(roomCode);
  const raw = JSON.stringify(obj);
  for (const client of room.clients) {
    if (client !== except && client.readyState === 1) {
      client.send(raw);
    }
  }
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    const filePath = path.normalize(path.join(ROOT, pathname));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500);
    res.end("Server error");
  }
});

const wss = new WebSocketServer({ server, path: "/sync" });

wss.on("connection", (ws) => {
  ws.roomCode = null;
  ws.role = null;

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch (_) {
      return;
    }

    if (msg.type === "join") {
      const roomCode = String(msg.room || "").toUpperCase();
      if (roomCode.length !== 4) return;
      if (ws.roomCode && ws.roomCode !== roomCode) {
        const prev = getRoom(ws.roomCode);
        prev.clients.delete(ws);
      }
      ws.roomCode = roomCode;
      ws.role = msg.role || "unknown";
      const room = getRoom(roomCode);
      room.clients.add(ws);
      safeSend(ws, {
        type: "joined",
        room: roomCode,
        role: ws.role,
        state: room.state,
        clients: room.clients.size,
      });
      if (room.state) {
        safeSend(ws, { type: "state", from: "server", state: room.state });
      }
      broadcast(
        roomCode,
        { type: "presence", room: roomCode, role: ws.role, clients: room.clients.size },
        ws
      );
      return;
    }

    if (!ws.roomCode) return;

    if (msg.type === "state" && msg.state) {
      const room = getRoom(ws.roomCode);
      room.state = Object.assign({}, room.state || {}, msg.state, {
        room: ws.roomCode,
        updatedAt: Date.now(),
      });
      const out = { type: "state", from: msg.from || ws.role, state: room.state };
      broadcast(ws.roomCode, out, null);
      return;
    }

    // Relay any other message (hello, command, etc.) to the room
    const out = Object.assign({}, msg, { room: ws.roomCode, from: msg.from || ws.role });
    broadcast(ws.roomCode, out, ws);
  });

  ws.on("close", () => {
    if (!ws.roomCode) return;
    const room = getRoom(ws.roomCode);
    room.clients.delete(ws);
    broadcast(ws.roomCode, {
      type: "presence",
      room: ws.roomCode,
      role: ws.role,
      clients: room.clients.size,
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Stella Nova listening on http://0.0.0.0:" + PORT);
  console.log("WebSocket sync at /sync");
});
