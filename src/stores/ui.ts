import { create } from "zustand";

const BRIDGE_URL_KEY = "tabletop:bridgeUrl";
const USE_BRIDGE_KEY = "tabletop:useBridge";
const DEFAULT_BRIDGE_URL = "http://127.0.0.1:7717";

function readLS(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

interface UIState {
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  settingsOpen: boolean;
  connectionsOpen: boolean;
  theme: "dark" | "light";
  fontSize: number;
  minimap: boolean;
  resultDensity: "compact" | "comfortable";
  bridgeUrl: string;
  useBridge: boolean;
  toggleSidebar: () => void;
  setPalette: (open: boolean) => void;
  setSettings: (open: boolean) => void;
  setConnections: (open: boolean) => void;
  setTheme: (t: UIState["theme"]) => void;
  setFontSize: (n: number) => void;
  setMinimap: (b: boolean) => void;
  setResultDensity: (d: UIState["resultDensity"]) => void;
  setBridgeUrl: (url: string) => void;
  setUseBridge: (b: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  sidebarCollapsed: false,
  paletteOpen: false,
  settingsOpen: false,
  connectionsOpen: false,
  theme: "dark",
  fontSize: 13,
  minimap: false,
  resultDensity: "comfortable",
  bridgeUrl: readLS(BRIDGE_URL_KEY, DEFAULT_BRIDGE_URL),
  useBridge: readLS(USE_BRIDGE_KEY, "true") === "true",
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setSettings: (settingsOpen) => set({ settingsOpen }),
  setConnections: (connectionsOpen) => set({ connectionsOpen }),
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  setMinimap: (minimap) => set({ minimap }),
  setResultDensity: (resultDensity) => set({ resultDensity }),
  setBridgeUrl: (bridgeUrl) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BRIDGE_URL_KEY, bridgeUrl.replace(/\/$/, ""));
    }
    set({ bridgeUrl: bridgeUrl.replace(/\/$/, "") });
  },
  setUseBridge: (useBridge) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USE_BRIDGE_KEY, String(useBridge));
    }
    set({ useBridge });
  },
}));
