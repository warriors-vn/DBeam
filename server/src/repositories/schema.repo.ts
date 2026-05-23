import type { RowDataPacket } from "mysql2/promise";
import { getPool, withTimeout } from "../db/pool.js";

export async function listDatabases(connectionId: string): Promise<string[]> {
  const { pool } = getPool(connectionId);
  const [rows] = await withTimeout(pool.query<RowDataPacket[]>("SHOW DATABASES"));
  return rows.map((r) => Object.values(r)[0] as string);
}

export interface TableInfo {
  name: string;
  kind: "table" | "view";
  rows: number;
}

export async function listTables(connectionId: string, database: string): Promise<TableInfo[]> {
  const { pool } = getPool(connectionId);
  const [rows] = await withTimeout(
    pool.query<RowDataPacket[]>(
      `SELECT TABLE_NAME as name, TABLE_TYPE as type, TABLE_ROWS as rowEstimate
       FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [database],
    ),
  );
  return rows.map((r) => ({
    name: r.name as string,
    kind: (r.type as string) === "VIEW" ? "view" : "table",
    rows: Number(r.rowEstimate ?? 0),
  }));
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  pk: boolean;
  fk: { table: string; column: string } | null;
}

export async function listColumns(
  connectionId: string,
  database: string,
  table: string,
): Promise<ColumnInfo[]> {
  const { pool } = getPool(connectionId);
  const [cols] = await withTimeout(
    pool.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [database, table],
    ),
  );
  const [fks] = await withTimeout(
    pool.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [database, table],
    ),
  );
  const fkMap = new Map(
    fks.map((r) => [
      r.COLUMN_NAME as string,
      { table: r.REFERENCED_TABLE_NAME as string, column: r.REFERENCED_COLUMN_NAME as string },
    ]),
  );
  return cols.map((c) => ({
    name: c.COLUMN_NAME as string,
    type: c.COLUMN_TYPE as string,
    nullable: (c.IS_NULLABLE as string) === "YES",
    default: (c.COLUMN_DEFAULT as string | null) ?? null,
    pk: (c.COLUMN_KEY as string) === "PRI",
    fk: fkMap.get(c.COLUMN_NAME as string) ?? null,
  }));
}

export async function listProcedures(connectionId: string, database: string): Promise<string[]> {
  const { pool } = getPool(connectionId);
  const [rows] = await withTimeout(
    pool.query<RowDataPacket[]>(
      `SELECT ROUTINE_NAME FROM information_schema.ROUTINES
       WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`,
      [database],
    ),
  );
  return rows.map((r) => r.ROUTINE_NAME as string);
}