import { create } from "zustand";
import { uid } from "@/lib/id";
import type { QueryResult } from "@/mock/execute";

export type TabKind = "query" | "table";

export interface BaseTab {
  id: string;
  kind: TabKind;
  title: string;
  dirty?: boolean;
}

export interface QueryTab extends BaseTab {
  kind: "query";
  sql: string;
  result?: QueryResult;
  running?: boolean;
  error?: string;
}

export interface TableTab extends BaseTab {
  kind: "table";
  database: string;
  table: string;
  result?: QueryResult;
  running?: boolean;
}

export type Tab = QueryTab | TableTab;

interface TabsState {
  tabs: Tab[];
  activeId: string | null;
  newQueryTab: (sql?: string) => string;
  openTable: (database: string, table: string) => string;
  close: (id: string) => void;
  setActive: (id: string) => void;
  update: (id: string, patch: Partial<Tab>) => void;
  rename: (id: string, title: string) => void;
}

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [],
  activeId: null,
  newQueryTab(sql = "-- New query\nSELECT * FROM users LIMIT 100;") {
    const id = uid();
    const tab: QueryTab = {
      id,
      kind: "query",
      title: `Query ${get().tabs.filter((t) => t.kind === "query").length + 1}`,
      sql,
    };
    set({ tabs: [...get().tabs, tab], activeId: id });
    return id;
  },
  openTable(database, table) {
    const existing = get().tabs.find(
      (t) => t.kind === "table" && t.database === database && t.table === table,
    );
    if (existing) {
      set({ activeId: existing.id });
      return existing.id;
    }
    const id = uid();
    const tab: TableTab = { id, kind: "table", title: table, database, table };
    set({ tabs: [...get().tabs, tab], activeId: id });
    return id;
  },
  close(id) {
    const tabs = get().tabs.filter((t) => t.id !== id);
    const activeId =
      get().activeId === id ? (tabs[tabs.length - 1]?.id ?? null) : get().activeId;
    set({ tabs, activeId });
  },
  setActive(id) {
    set({ activeId: id });
  },
  update(id, patch) {
    set({
      tabs: get().tabs.map((t) => (t.id === id ? ({ ...t, ...patch } as Tab) : t)),
    });
  },
  rename(id, title) {
    set({ tabs: get().tabs.map((t) => (t.id === id ? { ...t, title } : t)) });
  },
}));
