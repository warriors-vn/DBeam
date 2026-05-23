import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function attachWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: "hello", payload: { ts: Date.now() } }));
    ws.on("close", () => clients.delete(ws));
  });
}

export function broadcast(type: string, payload: unknown) {
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  for (const c of clients) {
    if (c.readyState === c.OPEN) c.send(msg);
  }
}
