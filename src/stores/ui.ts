import { create } from "zustand";
import { defaultPreferences, loadPreferences, savePreferences } from "@/services/persistence";
import type { AppPreferences } from "@/types/desktop";

interface UIState {
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  settingsOpen: boolean;
  connectionsOpen: boolean;
  hydrated: boolean;
  theme: AppPreferences["theme"];
  fontSize: number;
  minimap: boolean;
  resultDensity: AppPreferences["resultDensity"];
  reducedMotion: boolean;
  vimMode: boolean;
  hydrate: () => Promise<void>;
  toggleSidebar: () => void;
  setPalette: (open: boolean) => void;
  setSettings: (open: boolean) => void;
  setConnections: (open: boolean) => void;
  setTheme: (t: UIState["theme"]) => void;
  setFontSize: (n: number) => void;
  setMinimap: (b: boolean) => void;
  setResultDensity: (d: UIState["resultDensity"]) => void;
  setReducedMotion: (b: boolean) => void;
  setVimMode: (b: boolean) => void;
}

function pickPreferences(state: UIState): AppPreferences {
  return {
    theme: state.theme,
    fontSize: state.fontSize,
    minimap: state.minimap,
    resultDensity: state.resultDensity,
    reducedMotion: state.reducedMotion,
    vimMode: state.vimMode,
  };
}

export const useUI = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  paletteOpen: false,
  settingsOpen: false,
  connectionsOpen: false,
  hydrated: false,
  theme: defaultPreferences.theme,
  fontSize: defaultPreferences.fontSize,
  minimap: defaultPreferences.minimap,
  resultDensity: defaultPreferences.resultDensity,
  reducedMotion: defaultPreferences.reducedMotion,
  vimMode: defaultPreferences.vimMode,
  async hydrate() {
    const preferences = await loadPreferences();
    set({ hydrated: true, ...preferences });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setSettings: (settingsOpen) => set({ settingsOpen }),
  setConnections: (connectionsOpen) => set({ connectionsOpen }),
  setTheme: (theme) => {
    set({ theme });
    void savePreferences(pickPreferences(get()));
  },
  setFontSize: (fontSize) => {
    set({ fontSize });
    void savePreferences(pickPreferences(get()));
  },
  setMinimap: (minimap) => {
    set({ minimap });
    void savePreferences(pickPreferences(get()));
  },
  setResultDensity: (resultDensity) => {
    set({ resultDensity });
    void savePreferences(pickPreferences(get()));
  },
  setReducedMotion: (reducedMotion) => {
    set({ reducedMotion });
    void savePreferences(pickPreferences(get()));
  },
  setVimMode: (vimMode) => {
    set({ vimMode });
    void savePreferences(pickPreferences(get()));
  },
}));
