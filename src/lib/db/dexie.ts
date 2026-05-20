import Dexie, { type Table } from "dexie";

export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string; // NOTE: encrypted at rest in a real backend; local-only here
  database: string;
  ssl: boolean;
  color?: string;
  createdAt: number;
  lastUsedAt?: number;
}

export interface QueryHistoryEntry {
  id: string;
  connectionId: string;
  sql: string;
  ranAt: number;
  durationMs: number;
  rowCount: number;
  ok: boolean;
}

export interface SettingsRow {
  key: string;
  value: unknown;
}

class TabletopDB extends Dexie {
  connections!: Table<Connection, string>;
  history!: Table<QueryHistoryEntry, string>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super("tabletop");
    this.version(1).stores({
      connections: "id, name, lastUsedAt",
      history: "id, connectionId, ranAt",
      settings: "key",
    });
  }
}

export const db = typeof window !== "undefined" ? new TabletopDB() : (undefined as unknown as TabletopDB);
