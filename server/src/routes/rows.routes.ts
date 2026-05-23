import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { deleteRow, insertRow, updateRow } from "../repositories/rows.repo.js";

export const rowsRouter = Router();

const base = z.object({
  connectionId: z.string().min(1),
  database: z.string().min(1),
  table: z.string().min(1),
});

const insertSchema = base.extend({ values: z.record(z.string(), z.unknown()) });
rowsRouter.post("/insert", validateBody(insertSchema), async (req, res) => {
  const { connectionId, database, table, values } = req.body as z.infer<typeof insertSchema>;
  res.json(await insertRow(connectionId, database, table, values));
});

const updateSchema = base.extend({
  where: z.record(z.string(), z.unknown()),
  patch: z.record(z.string(), z.unknown()),
});
rowsRouter.post("/update", validateBody(updateSchema), async (req, res) => {
  const { connectionId, database, table, where, patch } = req.body as z.infer<typeof updateSchema>;
  res.json(await updateRow(connectionId, database, table, where, patch));
});

const deleteSchema = base.extend({ where: z.record(z.string(), z.unknown()) });
rowsRouter.post("/delete", validateBody(deleteSchema), async (req, res) => {
  const { connectionId, database, table, where } = req.body as z.infer<typeof deleteSchema>;
  res.json(await deleteRow(connectionId, database, table, where));
});
