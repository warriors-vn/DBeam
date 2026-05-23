/**
 * Thin HTTP + WebSocket client for the local Tabletop bridge agent.
 * The bridge runs at http://127.0.0.1:7717 by default — configurable in Settings.
 */
import type { Connection } from "@/lib/db/dexie";

export interface BridgeHealth {
  ok: true;
  name: string;
  version: string;
  safeMode: boolean;
  uptimeSec: number;
}

export interface BridgeColumn {
  name: string;
  type: string;
}

export interface BridgeQueryResult {
  columns: BridgeColumn[];
  rows: Array<Array<string | number | boolean | null>>;
  rowCount: number;
  affected?: number;
  durationMs: number;
  message?: string;
}

export interface BridgeTableInfo {
  name: string;
  kind: "table" | "view";
  rows: number;
}

export interface BridgeColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  pk: boolean;
  fk: { table: string; column: string } | null;
}

const DEFAULT_URL = "http://127.0.0.1:7717";

export function getBridgeUrl(): string {
  if (typeof window === "undefined") return DEFAULT_URL;
  return window.localStorage.getItem("tabletop:bridgeUrl") || DEFAULT_URL;
}

export function setBridgeUrl(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("tabletop:bridgeUrl", url.replace(/\/$/, ""));
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBridgeUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    try {
      const json = JSON.parse(body) as { message?: string; error?: string };
      throw new Error(json.message ?? json.error ?? `Bridge ${res.status}`);
    } catch {
      throw new Error(`Bridge ${res.status}: ${body.slice(0, 200)}`);
    }
  }
  return res.json() as Promise<T>;
}

function connPayload(c: Connection) {
  return {
    id: c.id,
    name: c.name,
    host: c.host,
    port: c.port,
    username: c.username,
    password: c.password,
    database: c.database,
    ssl: c.ssl,
    favorite: false,
  };
}

export const bridge = {
  health(): Promise<BridgeHealth> {
    return call<BridgeHealth>("/health");
  },
  async testConnection(c: Connection): Promise<{ ok: true; latencyMs: number }> {
    return call("/connections/test", {
      method: "POST",
      body: JSON.stringify(connPayload(c)),
    });
  },
  async saveConnection(c: Connection) {
    return call<{ connection: { id: string } }>("/connections/save", {
      method: "POST",
      body: JSON.stringify(connPayload(c)),
    });
  },
  async connect(c: Connection): Promise<{ connectionId: string; name: string }> {
    await this.saveConnection(c);
    return call("/connections/connect", {
      method: "POST",
      body: JSON.stringify({ id: c.id }),
    });
  },
  async disconnect(poolId: string) {
    return call("/connections/disconnect", {
      method: "POST",
      body: JSON.stringify({ id: poolId }),
    });
  },
  databases(poolId: string): Promise<{ databases: string[] }> {
    return call(`/schemas?connectionId=${encodeURIComponent(poolId)}`);
  },
  tables(poolId: string, database: string): Promise<{ tables: BridgeTableInfo[]; procedures: string[] }> {
    return call(`/tables?connectionId=${encodeURIComponent(poolId)}&database=${encodeURIComponent(database)}`);
  },
  columns(poolId: string, database: string, table: string): Promise<{ columns: BridgeColumnInfo[] }> {
    return call(
      `/tables/${encodeURIComponent(table)}/columns?connectionId=${encodeURIComponent(poolId)}&database=${encodeURIComponent(database)}`,
    );
  },
  execute(poolId: string, sql: string, tabId?: string): Promise<BridgeQueryResult> {
    return call("/query/execute", {
      method: "POST",
      body: JSON.stringify({ connectionId: poolId, sql, meta: tabId ? { tabId } : undefined }),
    });
  },
  insertRow(poolId: string, database: string, table: string, values: Record<string, unknown>) {
    return call<{ affected: number; insertId: number }>("/rows/insert", {
      method: "POST",
      body: JSON.stringify({ connectionId: poolId, database, table, values }),
    });
  },
  updateRow(
    poolId: string, database: string, table: string,
    where: Record<string, unknown>, patch: Record<string, unknown>,
  ) {
    return call<{ affected: number }>("/rows/update", {
      method: "POST",
      body: JSON.stringify({ connectionId: poolId, database, table, where, patch }),
    });
  },
  deleteRow(poolId: string, database: string, table: string, where: Record<string, unknown>) {
    return call<{ affected: number }>("/rows/delete", {
      method: "POST",
      body: JSON.stringify({ connectionId: poolId, database, table, where }),
    });
  },
};

/** Subscribe to bridge WebSocket events. Returns an unsubscribe function. */
export function subscribeBridgeEvents(
  onEvent: (evt: { type: string; payload: unknown; ts: number }) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const wsUrl = getBridgeUrl().replace(/^http/, "ws") + "/ws";
  let socket: WebSocket | null = null;
  let closed = false;
  let retry = 0;

  const connect = () => {
    if (closed) return;
    try {
      socket = new WebSocket(wsUrl);
    } catch {
      return;
    }
    socket.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data as string));
      } catch { /* ignore */ }
    };
    socket.onclose = () => {
      if (closed) return;
      retry = Math.min(retry + 1, 6);
      setTimeout(connect, 500 * retry);
    };
    socket.onerror = () => socket?.close();
  };
  connect();

  return () => {
    closed = true;
    socket?.close();
  };
}