import { create } from "zustand";
import { bridge } from "@/services/bridge";
import { loadActiveConnectionId, saveActiveConnectionId } from "@/services/persistence";
import type { ConnectionDetails, ConnectionInput, ConnectionSummary } from "@/types/desktop";

interface ConnectionsState {
  list: ConnectionSummary[];
  activeId: string | null;
  activePoolId: string | null;
  loaded: boolean;
  loading: boolean;
  hydrateSelection: () => Promise<void>;
  load: () => Promise<void>;
  upsert: (c: ConnectionInput) => Promise<ConnectionSummary>;
  getConnection: (id: string) => Promise<ConnectionDetails>;
  test: (c: ConnectionInput) => Promise<{ ok: true; latencyMs: number }>;
  remove: (id: string) => Promise<void>;
  connect: (id: string) => Promise<void>;
  setActivePool: (poolId: string | null) => void;
  disconnect: () => Promise<void>;
}

export const useConnections = create<ConnectionsState>((set, get) => ({
  list: [],
  activeId: null,
  activePoolId: null,
  loaded: false,
  loading: false,
  async hydrateSelection() {
    set({ activeId: await loadActiveConnectionId() });
  },
  async load() {
    set({ loading: true });
    try {
      const { connections } = await bridge.listConnections();
      const list = [...connections].sort(
        (a, b) => Number(b.lastUsedAt ?? 0) - Number(a.lastUsedAt ?? 0),
      );
      set({ list, loaded: true, loading: false });
    } catch {
      set({ loading: false });
      throw new Error("Failed to load saved connections");
    }
  },
  async upsert(c) {
    const saved = await bridge.saveConnection(c);
    await get().load();
    return saved;
  },
  async getConnection(id) {
    return bridge.getConnection(id);
  },
  async test(c) {
    return bridge.testConnection(c);
  },
  async remove(id) {
    if (get().activePoolId && get().activeId === id) {
      await bridge.disconnect(get().activePoolId!);
    }
    await bridge.removeConnection(id);
    if (get().activeId === id) {
      set({ activeId: null, activePoolId: null });
      await saveActiveConnectionId(null);
    }
    await get().load();
  },
  async connect(id) {
    const session = await bridge.connect(id);
    set({ activeId: id, activePoolId: session.connectionId });
    await saveActiveConnectionId(id);
    await get().load();
  },
  setActivePool(activePoolId) {
    set({ activePoolId });
  },
  async disconnect() {
    const activePoolId = get().activePoolId;
    if (activePoolId) {
      await bridge.disconnect(activePoolId);
    }
    set({ activeId: null, activePoolId: null });
    await saveActiveConnectionId(null);
  },
}));
