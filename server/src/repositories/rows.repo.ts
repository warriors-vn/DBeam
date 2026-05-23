import type { ResultSetHeader } from "mysql2/promise";
import { getPool, withTimeout } from "../db/pool.js";

function ident(name: string): string {
  if (!/^[A-Za-z0-9_$]+$/.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `\`${name}\``;
}

export async function insertRow(
  connectionId: string,
  database: string,
  table: string,
  values: Record<string, unknown>,
): Promise<{ affected: number; insertId: number }> {
  const { pool } = getPool(connectionId);
  const cols = Object.keys(values);
  const sql = `INSERT INTO ${ident(database)}.${ident(table)} (${cols.map(ident).join(",")}) VALUES (${cols.map(() => "?").join(",")})`;
  const [res] = await withTimeout(
    pool.query(
      sql,
      cols.map((c) => values[c]),
    ),
  );
  const header = res as ResultSetHeader;
  return { affected: header.affectedRows, insertId: header.insertId };
}

export async function updateRow(
  connectionId: string,
  database: string,
  table: string,
  where: Record<string, unknown>,
  patch: Record<string, unknown>,
): Promise<{ affected: number }> {
  if (Object.keys(where).length === 0) throw new Error("Refusing UPDATE without where clause");
  const { pool } = getPool(connectionId);
  const setCols = Object.keys(patch);
  const whereCols = Object.keys(where);
  const sql =
    `UPDATE ${ident(database)}.${ident(table)} SET ` +
    setCols.map((c) => `${ident(c)} = ?`).join(", ") +
    ` WHERE ` +
    whereCols.map((c) => `${ident(c)} = ?`).join(" AND ") +
    ` LIMIT 1`;
  const params = [...setCols.map((c) => patch[c]), ...whereCols.map((c) => where[c])];
  const [res] = await withTimeout(pool.query(sql, params));
  return { affected: (res as ResultSetHeader).affectedRows };
}

export async function deleteRow(
  connectionId: string,
  database: string,
  table: string,
  where: Record<string, unknown>,
): Promise<{ affected: number }> {
  if (Object.keys(where).length === 0) throw new Error("Refusing DELETE without where clause");
  const { pool } = getPool(connectionId);
  const whereCols = Object.keys(where);
  const sql =
    `DELETE FROM ${ident(database)}.${ident(table)} WHERE ` +
    whereCols.map((c) => `${ident(c)} = ?`).join(" AND ") +
    ` LIMIT 1`;
  const [res] = await withTimeout(
    pool.query(
      sql,
      whereCols.map((c) => where[c]),
    ),
  );
  return { affected: (res as ResultSetHeader).affectedRows };
}
