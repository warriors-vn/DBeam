import { JSONFilePreset } from "lowdb/node";
import { encrypt, decrypt } from "./crypto.js";

export interface StoredConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  passwordEnc: string;
  database: string;
  ssl: boolean;
  favorite: boolean;
  createdAt: number;
  lastUsedAt?: number;
}

interface Schema {
  connections: StoredConnection[];
  history: Array<{
    id: string;
    connectionId: string;
    sql: string;
    ranAt: number;
    durationMs: number;
    rowCount: number;
    ok: boolean;
  }>;
}

const db = await JSONFilePreset<Schema>("tabletop-bridge.json", {
  connections: [],
  history: [],
});

export const store = {
  list() {
    return db.data.connections.map(({ passwordEnc: _p, ...rest }) => rest);
  },
  get(id: string) {
    const c = db.data.connections.find((x) => x.id === id);
    if (!c) return null;
    return { ...c, password: decrypt(c.passwordEnc) };
  },
  async upsert(
    c: Omit<StoredConnection, "passwordEnc" | "createdAt"> & {
      password: string;
      createdAt?: number;
    },
  ) {
    const existing = db.data.connections.find((x) => x.id === c.id);
    const row: StoredConnection = {
      id: c.id,
      name: c.name,
      host: c.host,
      port: c.port,
      username: c.username,
      passwordEnc: encrypt(c.password),
      database: c.database,
      ssl: c.ssl,
      favorite: c.favorite,
      createdAt: existing?.createdAt ?? c.createdAt ?? Date.now(),
      lastUsedAt: c.lastUsedAt,
    };
    if (existing) Object.assign(existing, row);
    else db.data.connections.push(row);
    await db.write();
    return row;
  },
  async remove(id: string) {
    db.data.connections = db.data.connections.filter((x) => x.id !== id);
    await db.write();
  },
  async touchUsed(id: string) {
    const c = db.data.connections.find((x) => x.id === id);
    if (c) {
      c.lastUsedAt = Date.now();
      await db.write();
    }
  },
  async addHistory(h: Schema["history"][number]) {
    db.data.history.unshift(h);
    db.data.history = db.data.history.slice(0, 500);
    await db.write();
  },
  history() {
    return db.data.history;
  },
};
