import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { execute, preview } from "../repositories/query.repo.js";
import { broadcast } from "../websocket/index.js";
import { store } from "../db/store.js";
import { randomUUID } from "node:crypto";

export const queryRouter = Router();

const execSchema = z.object({
  connectionId: z.string().min(1),
  sql: z.string().min(1).max(200_000),
  meta: z.object({ tabId: z.string().optional() }).optional(),
});

queryRouter.post("/execute", validateBody(execSchema), async (req, res) => {
  const { connectionId, sql, meta } = req.body as z.infer<typeof execSchema>;
  const qid = randomUUID();
  broadcast("query.started", { id: qid, tabId: meta?.tabId, sql });
  try {
    const result = await execute(connectionId, sql);
    broadcast("query.completed", { id: qid, durationMs: result.durationMs, rowCount: result.rowCount });
    await store.addHistory({
      id: qid, connectionId, sql, ranAt: Date.now(),
      durationMs: result.durationMs, rowCount: result.rowCount, ok: true,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query failed";
    broadcast("query.failed", { id: qid, message });
    await store.addHistory({
      id: qid, connectionId, sql, ranAt: Date.now(), durationMs: 0, rowCount: 0, ok: false,
    });
    throw err;
  }
});

const previewSchema = execSchema.extend({ limit: z.number().int().min(1).max(5000).default(500) });
queryRouter.post("/preview", validateBody(previewSchema), async (req, res) => {
  const { connectionId, sql, limit } = req.body as z.infer<typeof previewSchema>;
  res.json(await preview(connectionId, sql, limit));
});

queryRouter.get("/history", (_req, res) => {
  res.json({ history: store.history() });
});