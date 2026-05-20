import { create } from "zustand";
import { db, type Connection } from "@/lib/db/dexie";
import { uid } from "@/lib/id";

interface ConnectionsState {
  list: Connection[];
  activeId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  upsert: (c: Omit<Connection, "id" | "createdAt"> & { id?: string }) => Promise<Connection>;
  remove: (id: string) => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: () => void;
}

export const useConnections = create<ConnectionsState>((set, get) => ({
  list: [],
  activeId: null,
  loaded: false,
  async load() {
    if (!db) return;
    const list = await db.connections.orderBy("lastUsedAt").reverse().toArray();
    set({ list, loaded: true });
  },
  async upsert(c) {
    const now = Date.now();
    const next: Connection = {
      id: c.id ?? uid(),
      createdAt: now,
      name: c.name,
      host: c.host,
      port: c.port,
      username: c.username,
      password: c.password,
      database: c.database,
      ssl: c.ssl,
      color: c.color,
      lastUsedAt: c.id ? get().list.find((x) => x.id === c.id)?.lastUsedAt : undefined,
    };
    await db.connections.put(next);
    await get().load();
    return next;
  },
  async remove(id) {
    await db.connections.delete(id);
    if (get().activeId === id) set({ activeId: null });
    await get().load();
  },
  async connect(id) {
    await db.connections.update(id, { lastUsedAt: Date.now() });
    set({ activeId: id });
    await get().load();
  },
  disconnect() {
    set({ activeId: null });
  },
}));
