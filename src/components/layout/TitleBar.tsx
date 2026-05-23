import { useUI } from "@/stores/ui";
import { useConnections } from "@/stores/connections";
import {
  Bot,
  Database,
  Minus,
  PanelLeft,
  Plug,
  Search,
  Settings as Cog,
  Square,
  X,
} from "lucide-react";
import { BridgeStatus } from "./BridgeStatus";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "@/services/window";
import { isTauriDesktop } from "@/services/bridge";
import { useWorkspace } from "@/stores/workspace";

export function TitleBar() {
  const { toggleSidebar, setPalette, setSettings, setConnections } = useUI();
  const { activeId, list } = useConnections();
  const active = list.find((c) => c.id === activeId);
  const workspace = useWorkspace((state) => state.activeWorkspace());
  const openPanel = useWorkspace((state) => state.openPanel);
  const isDesktop = isTauriDesktop();

  return (
    <div
      className="glass flex h-11 shrink-0 items-center gap-2 px-3 select-none"
      data-tauri-drag-region={isDesktop ? "" : undefined}
    >
      <div className="flex items-center gap-1.5 pr-2">
        <button
          onClick={() => void closeWindow()}
          className="flex size-3 items-center justify-center rounded-full bg-[oklch(0.65_0.22_25)]/90 text-transparent hover:text-black/45"
          aria-label="Close window"
        >
          <X className="size-2" />
        </button>
        <button
          onClick={() => void minimizeWindow()}
          className="flex size-3 items-center justify-center rounded-full bg-[oklch(0.82_0.17_85)]/90 text-transparent hover:text-black/45"
          aria-label="Minimize window"
        >
          <Minus className="size-2" />
        </button>
        <button
          onClick={() => void toggleMaximizeWindow()}
          className="flex size-3 items-center justify-center rounded-full bg-[oklch(0.72_0.18_145)]/90 text-transparent hover:text-black/45"
          aria-label="Toggle maximize"
        >
          <Square className="size-1.5" />
        </button>
      </div>

      <button
        onClick={toggleSidebar}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="size-4" />
      </button>

      <div className="flex items-center gap-2 text-xs font-medium tracking-tight">
        <Database className="size-3.5 text-primary" />
        <span className="text-foreground">DBeam</span>
        <span className="text-muted-foreground">/</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
          {workspace?.name ?? "Workspace"}
        </span>
        <span className="text-muted-foreground">/</span>
        <button
          onClick={() => setConnections(true)}
          className="rounded-md px-2 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {active ? active.name : "No connection"}
        </button>
      </div>

      <div className="flex-1" />

      <button
        onClick={() => setPalette(true)}
        className="glass-soft flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Search className="size-3.5" />
        <span>Search tables, commands, windows…</span>
        <span className="ml-6 flex items-center gap-1">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      <div className="flex-1" />

      <BridgeStatus />

      <button
        onClick={() => openPanel("ai")}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Open AI copilot"
      >
        <Bot className="size-4" />
      </button>

      <button
        onClick={() => setConnections(true)}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Connections"
      >
        <Plug className="size-4" />
      </button>
      <button
        onClick={() => setSettings(true)}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Settings"
      >
        <Cog className="size-4" />
      </button>
    </div>
  );
}
