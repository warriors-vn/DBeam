import { useEffect } from "react";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "@/features/sidebar/Sidebar";
import { TabBar } from "./TabBar";
import { useTabs } from "@/stores/tabs";
import { SqlEditor } from "@/features/editor/SqlEditor";
import { TableView } from "@/features/editor/TableView";
import { useUI } from "@/stores/ui";
import { useConnections } from "@/stores/connections";
import { ConnectionsDialog } from "@/features/connections/ConnectionsDialog";
import { SettingsDialog } from "@/features/palette/SettingsDialog";
import { CommandPalette } from "@/features/palette/CommandPalette";
import { Toaster } from "@/components/ui/sonner";
import { Database, Plug, Sparkles } from "lucide-react";

export function AppShell() {
  const { tabs, activeId, close, newQueryTab } = useTabs();
  const { theme, setPalette, setConnections } = useUI();
  const loadConnections = useConnections((s) => s.load);
  const activeConnId = useConnections((s) => s.activeId);
  const connList = useConnections((s) => s.list);
  const activeConn = connList.find((c) => c.id === activeConnId);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPalette(true);
      } else if (mod && e.key.toLowerCase() === "t") {
        e.preventDefault();
        newQueryTab();
      } else if (mod && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeId) close(activeId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeId, close, newQueryTab, setPalette]);

  const active = tabs.find((t) => t.id === activeId);

  return (
    <div className="app-ambient flex h-screen w-screen flex-col text-foreground">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          {tabs.length > 0 && <TabBar />}
          <div className="min-h-0 flex-1">
            {active ? (
              active.kind === "query" ? (
                <SqlEditor tab={active} />
              ) : (
                <TableView tab={active} />
              )
            ) : (
              <Welcome
                hasConnection={!!activeConn}
                onNew={() => newQueryTab()}
                onConnections={() => setConnections(true)}
              />
            )}
          </div>
        </main>
      </div>
      <ConnectionsDialog />
      <SettingsDialog />
      <CommandPalette />
      <Toaster position="bottom-right" />
    </div>
  );
}

function Welcome({
  hasConnection,
  onNew,
  onConnections,
}: {
  hasConnection: boolean;
  onNew: () => void;
  onConnections: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="glass max-w-lg rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Database className="size-6" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Tabletop</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          A fast, beautiful MySQL workspace. Built for keyboard-first developers.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={hasConnection ? onNew : onConnections}
            className="glass-soft flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium hover:bg-accent"
          >
            {hasConnection ? (
              <>
                <Sparkles className="size-3.5" /> New query
                <span className="ml-2 flex items-center gap-1">
                  <span className="kbd">⌘</span>
                  <span className="kbd">T</span>
                </span>
              </>
            ) : (
              <>
                <Plug className="size-3.5" /> Create connection
              </>
            )}
          </button>
          <button
            onClick={onConnections}
            className="glass-soft flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium hover:bg-accent"
          >
            <Plug className="size-3.5" /> Connections
          </button>
        </div>
        <div className="mt-6 text-[11px] text-muted-foreground">
          Press <span className="kbd">⌘</span> <span className="kbd">K</span> for the command palette
        </div>
      </div>
    </div>
  );
}
