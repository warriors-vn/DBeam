import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { connectionsRouter } from "./routes/connections.routes.js";
import { schemaRouter } from "./routes/schema.routes.js";
import { queryRouter } from "./routes/query.routes.js";
import { rowsRouter } from "./routes/rows.routes.js";
import { attachWebSocket } from "./websocket/index.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow same-origin / curl
      if (env.corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    name: "tabletop-bridge",
    version: "0.1.0",
    safeMode: env.safeMode,
    uptimeSec: Math.round(process.uptime()),
  });
});

app.use("/connections", connectionsRouter);
app.use("/", schemaRouter);
app.use("/query", queryRouter);
app.use("/rows", rowsRouter);

app.use(errorHandler);

const server = createServer(app);
attachWebSocket(server);

server.listen(env.port, "127.0.0.1", () => {
  console.log(`[bridge] listening on http://127.0.0.1:${env.port} (safe mode: ${env.safeMode})`);
});
