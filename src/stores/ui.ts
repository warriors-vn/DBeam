import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  settingsOpen: boolean;
  connectionsOpen: boolean;
  theme: "dark" | "light";
  fontSize: number;
  minimap: boolean;
  resultDensity: "compact" | "comfortable";
  toggleSidebar: () => void;
  setPalette: (open: boolean) => void;
  setSettings: (open: boolean) => void;
  setConnections: (open: boolean) => void;
  setTheme: (t: UIState["theme"]) => void;
  setFontSize: (n: number) => void;
  setMinimap: (b: boolean) => void;
  setResultDensity: (d: UIState["resultDensity"]) => void;
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
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setSettings: (settingsOpen) => set({ settingsOpen }),
  setConnections: (connectionsOpen) => set({ connectionsOpen }),
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  setMinimap: (minimap) => set({ minimap }),
  setResultDensity: (resultDensity) => set({ resultDensity }),
}));
