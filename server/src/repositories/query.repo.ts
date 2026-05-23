import type { FieldPacket, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getPool, withTimeout } from "../db/pool.js";
import { env } from "../config/env.js";

export interface QueryColumn {
  name: string;
  type: string;
}

export interface ExecResult {
  columns: QueryColumn[];
  rows: unknown[][];
  rowCount: number;
  affected?: number;
  durationMs: number;
  message?: string;
}

const TYPE_NAMES: Record<number, string> = {
  0: "decimal", 1: "tinyint", 2: "smallint", 3: "int", 4: "float",
  5: "double", 7: "timestamp", 8: "bigint", 9: "mediumint", 10: "date",
  11: "time", 12: "datetime", 13: "year", 15: "varchar", 16: "bit",
  245: "json", 246: "decimal", 252: "blob", 253: "varchar", 254: "char",
};

const DANGEROUS = /^\s*(drop|truncate)\b/i;
const UNSCOPED_WRITE = /^\s*(update|delete)\b(?![^;]*\bwhere\b)/i;

export async function execute(connectionId: string, sql: string): Promise<ExecResult> {
  if (env.safeMode) {
    if (DANGEROUS.test(sql)) throw new Error("Safe mode blocked DROP/TRUNCATE");
    if (UNSCOPED_WRITE.test(sql)) throw new Error("Safe mode blocked UPDATE/DELETE without WHERE");
  }
  const { pool } = getPool(connectionId);
  const started = performance.now();
  const [result, fields] = (await withTimeout(pool.query(sql))) as [
    RowDataPacket[] | ResultSetHeader,
    FieldPacket[] | undefined,
  ];
  const durationMs = Math.round(performance.now() - started);

  if (Array.isArray(result)) {
    const columns: QueryColumn[] =
      fields?.map((f) => ({ name: f.name, type: TYPE_NAMES[f.type as number] ?? String(f.type) })) ?? [];
    const rows = result.map((r) => columns.map((c) => (r as Record<string, unknown>)[c.name] ?? null));
    return { columns, rows, rowCount: rows.length, durationMs };
  }

  const header = result as ResultSetHeader;
  return {
    columns: [],
    rows: [],
    rowCount: 0,
    affected: header.affectedRows,
    durationMs,
    message: header.info || "OK",
  };
}

export async function preview(connectionId: string, sql: string, limit: number): Promise<ExecResult> {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  return execute(connectionId, `SELECT * FROM (${trimmed}) AS _p LIMIT ${Math.min(limit, 5000)}`);
}