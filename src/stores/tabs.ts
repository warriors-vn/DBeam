import { create } from "zustand";
import { uid } from "@/lib/id";
import {
  loadActiveTabId,
  loadWorkspaceTabs,
  saveActiveTabId,
  saveWorkspaceTabs,
} from "@/services/persistence";
import type {
  QueryTabState as QueryTab,
  TableTabState as TableTab,
  WorkspaceTabState as Tab,
} from "@/types/desktop";

export type { QueryTab, TableTab, Tab };

interface TabsState {
  tabs: Tab[];
  activeId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  newQueryTab: (sql?: string) => string;
  openTable: (database: string, table: string) => string;
  close: (id: string) => void;
  setActive: (id: string) => void;
  update: (id: string, patch: Partial<Tab>) => void;
  rename: (id: string, title: string) => void;
  toggleSticky: (id: string) => void;
}

async function persistTabs(tabs: Tab[], activeId: string | null) {
  await Promise.all([saveWorkspaceTabs(tabs), saveActiveTabId(activeId)]);
}

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [],
  activeId: null,
  hydrated: false,
  async hydrate() {
    const [tabs, activeId] = await Promise.all([loadWorkspaceTabs(), loadActiveTabId()]);
    set({ tabs, activeId, hydrated: true });
  },
  newQueryTab(sql = "-- New query\nSELECT * FROM users LIMIT 100;") {
    const id = uid();
    const tab: QueryTab = {
      id,
      kind: "query",
      title: `Query ${get().tabs.filter((t) => t.kind === "query").length + 1}`,
      sql,
      sticky: false,
    };
    const tabs = [...get().tabs, tab];
    set({ tabs, activeId: id });
    void persistTabs(tabs, id);
    return id;
  },
  openTable(database, table) {
    const existing = get().tabs.find(
      (t) => t.kind === "table" && t.database === database && t.table === table,
    );
    if (existing) {
      set({ activeId: existing.id });
      void saveActiveTabId(existing.id);
      return existing.id;
    }
    const id = uid();
    const tab: TableTab = {
      id,
      kind: "table",
      title: table,
      database,
      table,
      sticky: false,
    };
    const tabs = [...get().tabs, tab];
    set({ tabs, activeId: id });
    void persistTabs(tabs, id);
    return id;
  },
  close(id) {
    const tabs = get().tabs.filter((t) => t.id !== id);
    const activeId = get().activeId === id ? (tabs[tabs.length - 1]?.id ?? null) : get().activeId;
    set({ tabs, activeId });
    void persistTabs(tabs, activeId);
  },
  setActive(id) {
    set({ activeId: id });
    void saveActiveTabId(id);
  },
  update(id, patch) {
    const tabs = get().tabs.map((t) => (t.id === id ? ({ ...t, ...patch } as Tab) : t));
    set({ tabs });
    void persistTabs(tabs, get().activeId);
  },
  rename(id, title) {
    const tabs = get().tabs.map((t) => (t.id === id ? { ...t, title } : t));
    set({ tabs });
    void persistTabs(tabs, get().activeId);
  },
  toggleSticky(id) {
    const tabs = get().tabs.map((t) => (t.id === id ? { ...t, sticky: !t.sticky } : t));
    set({ tabs });
    void persistTabs(tabs, get().activeId);
  },
}));
