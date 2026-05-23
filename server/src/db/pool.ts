import mysql, { type Pool, type PoolOptions } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  ssl?: boolean;
}

interface PoolEntry {
  id: string;
  pool: Pool;
  config: ConnectionConfig;
  createdAt: number;
  lastUsedAt: number;
}

const pools = new Map<string, PoolEntry>();

function toOptions(c: ConnectionConfig): PoolOptions {
  return {
    host: c.host,
    port: c.port,
    user: c.user,
    password: c.password,
    database: c.database || undefined,
    ssl: c.ssl ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 8,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    dateStrings: true,
    multipleStatements: false,
  };
}

export async function testConnection(c: ConnectionConfig): Promise<void> {
  const conn = await mysql.createConnection({
    ...toOptions(c),
    connectionLimit: undefined as never,
  } as never);
  try {
    await conn.query("SELECT 1");
  } finally {
    await conn.end();
  }
}

export async function openPool(c: ConnectionConfig): Promise<string> {
  const pool = mysql.createPool(toOptions(c));
  // probe so we surface errors immediately
  const probe = await pool.getConnection();
  await probe.query("SELECT 1");
  probe.release();
  const id = randomUUID();
  pools.set(id, { id, pool, config: c, createdAt: Date.now(), lastUsedAt: Date.now() });
  return id;
}

export function getPool(id: string): PoolEntry {
  const entry = pools.get(id);
  if (!entry) throw new Error(`No active pool for connectionId=${id}`);
  entry.lastUsedAt = Date.now();
  return entry;
}

export async function closePool(id: string): Promise<void> {
  const entry = pools.get(id);
  if (!entry) return;
  pools.delete(id);
  await entry.pool.end();
}

export function listPools() {
  return [...pools.values()].map((p) => ({
    id: p.id,
    host: p.config.host,
    database: p.config.database,
    createdAt: p.createdAt,
    lastUsedAt: p.lastUsedAt,
  }));
}

export async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Query exceeded ${env.queryTimeoutMs}ms timeout`)),
      env.queryTimeoutMs,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
