import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { closePool, openPool, testConnection } from "../db/pool.js";
import { store } from "../db/store.js";
import { broadcast } from "../websocket/index.js";

const connSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(120),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1).max(120),
  password: z.string().max(512),
  database: z.string().max(120).default(""),
  ssl: z.boolean().default(false),
  favorite: z.boolean().default(false),
});

export const connectionsRouter = Router();

connectionsRouter.get("/", (_req, res) => {
  res.json({ connections: store.list() });
});

connectionsRouter.post("/save", validateBody(connSchema), async (req, res) => {
  const body = req.body as z.infer<typeof connSchema>;
  const id = body.id ?? crypto.randomUUID();
  const saved = await store.upsert({ ...body, id });
  res.json({ connection: { ...saved, passwordEnc: undefined } });
});

connectionsRouter.post("/test", validateBody(connSchema), async (req, res) => {
  const body = req.body as z.infer<typeof connSchema>;
  const started = Date.now();
  await testConnection({
    host: body.host, port: body.port, user: body.username,
    password: body.password, database: body.database || undefined, ssl: body.ssl,
  });
  res.json({ ok: true, latencyMs: Date.now() - started });
});

const connectSchema = z.object({ id: z.string().min(1) });
connectionsRouter.post("/connect", validateBody(connectSchema), async (req, res) => {
  const { id } = req.body as z.infer<typeof connectSchema>;
  const c = store.get(id);
  if (!c) return res.status(404).json({ error: "NotFound" });
  const poolId = await openPool({
    host: c.host, port: c.port, user: c.username,
    password: c.password, database: c.database || undefined, ssl: c.ssl,
  });
  await store.touchUsed(id);
  broadcast("connection.opened", { connectionId: poolId, name: c.name });
  res.json({ connectionId: poolId, name: c.name });
});

connectionsRouter.post("/disconnect", validateBody(connectSchema), async (req, res) => {
  const { id } = req.body as z.infer<typeof connectSchema>;
  await closePool(id);
  broadcast("connection.closed", { connectionId: id });
  res.json({ ok: true });
});

connectionsRouter.delete("/:id", async (req, res) => {
  await store.remove(req.params.id);
  res.json({ ok: true });
});