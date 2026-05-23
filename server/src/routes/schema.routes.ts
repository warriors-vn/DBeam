import { Router } from "express";
import { z } from "zod";
import {
  listColumns,
  listDatabases,
  listProcedures,
  listTables,
} from "../repositories/schema.repo.js";

export const schemaRouter = Router();

const idQuery = z.object({ connectionId: z.string().min(1) });

schemaRouter.get("/schemas", async (req, res) => {
  const { connectionId } = idQuery.parse(req.query);
  res.json({ databases: await listDatabases(connectionId) });
});

const tablesQuery = idQuery.extend({ database: z.string().min(1) });
schemaRouter.get("/tables", async (req, res) => {
  const { connectionId, database } = tablesQuery.parse(req.query);
  const [tables, procedures] = await Promise.all([
    listTables(connectionId, database),
    listProcedures(connectionId, database),
  ]);
  res.json({ tables, procedures });
});

const colsQuery = tablesQuery.extend({ table: z.string().min(1) });
schemaRouter.get("/tables/:table/columns", async (req, res) => {
  const { connectionId, database, table } = colsQuery.parse({
    ...req.query,
    table: req.params.table,
  });
  res.json({ columns: await listColumns(connectionId, database, table) });
});
