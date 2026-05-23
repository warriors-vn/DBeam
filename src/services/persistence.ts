import type { AppPreferences, WorkspaceTabState } from "@/types/desktop";
import { isTauriDesktop } from "./bridge";

const STORE_FILE = "workspace.json";
const KEYS = {
  preferences: "preferences",
  tabs: "tabs",
  activeTabId: "tabs.activeId",
  activeConnectionId: "connections.activeId",
} as const;

type LocalStore = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  save(): Promise<void>;
};

let storePromise: Promise<LocalStore> | null = null;

function browserStore(): LocalStore {
  return {
    async get<T>(key: string) {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(`dbeam:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    async set<T>(key: string, value: T) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(`dbeam:${key}`, JSON.stringify(value));
    },
    async save() {
      // no-op for localStorage
    },
  };
}

async function getStore(): Promise<LocalStore> {
  if (!storePromise) {
    storePromise = (async () => {
      if (!isTauriDesktop()) return browserStore();

      const mod = await import("@tauri-apps/plugin-store");
      const store = await mod.load(STORE_FILE, {
        autoSave: false,
        defaults: {},
      });
      return {
        async get<T>(key: string) {
          return ((await store.get(key)) as T | null) ?? null;
        },
        async set<T>(key: string, value: T) {
          await store.set(key, value);
        },
        async save() {
          await store.save();
        },
      };
    })();
  }

  return storePromise;
}

export const defaultPreferences: AppPreferences = {
  theme: "dark",
  fontSize: 13,
  minimap: false,
  resultDensity: "comfortable",
  reducedMotion: false,
  vimMode: false,
};

export async function loadPreferences(): Promise<AppPreferences> {
  const store = await getStore();
  const value = await store.get<Partial<AppPreferences>>(KEYS.preferences);
  return { ...defaultPreferences, ...(value ?? {}) };
}

export async function savePreferences(value: AppPreferences): Promise<void> {
  const store = await getStore();
  await store.set(KEYS.preferences, value);
  await store.save();
}

export async function loadWorkspaceTabs(): Promise<WorkspaceTabState[]> {
  const store = await getStore();
  return (await store.get<WorkspaceTabState[]>(KEYS.tabs)) ?? [];
}

export async function saveWorkspaceTabs(value: WorkspaceTabState[]): Promise<void> {
  const store = await getStore();
  await store.set(KEYS.tabs, value);
  await store.save();
}

export async function loadActiveTabId(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>(KEYS.activeTabId)) ?? null;
}

export async function saveActiveTabId(value: string | null): Promise<void> {
  const store = await getStore();
  await store.set(KEYS.activeTabId, value);
  await store.save();
}

export async function loadActiveConnectionId(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>(KEYS.activeConnectionId)) ?? null;
}

export async function saveActiveConnectionId(value: string | null): Promise<void> {
  const store = await getStore();
  await store.set(KEYS.activeConnectionId, value);
  await store.save();
}
