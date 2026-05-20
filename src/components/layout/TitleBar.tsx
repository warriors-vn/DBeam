import { useUI } from "@/stores/ui";
import { useConnections } from "@/stores/connections";
import { Database, PanelLeft, Plug, Search, Settings as Cog } from "lucide-react";

export function TitleBar() {
  const { toggleSidebar, setPalette, setSettings, setConnections } = useUI();
  const { activeId, list } = useConnections();
  const active = list.find((c) => c.id === activeId);

  return (
    <div className="glass flex h-11 shrink-0 items-center gap-2 px-3 select-none">
      {/* macOS traffic lights */}
      <div className="flex items-center gap-1.5 pr-2">
        <span className="size-3 rounded-full bg-[oklch(0.65_0.22_25)]" />
        <span className="size-3 rounded-full bg-[oklch(0.82_0.17_85)]" />
        <span className="size-3 rounded-full bg-[oklch(0.72_0.18_145)]" />
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
        <span className="text-foreground">Tabletop</span>
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
        <span>Search tables, commands…</span>
        <span className="ml-6 flex items-center gap-1">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      <div className="flex-1" />

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
