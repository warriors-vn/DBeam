import { type ReactNode } from "react";
import { Activity, BookText, Bot, Boxes, GitBranchPlus, Network, Sparkles } from "lucide-react";
import { AiChatPanel } from "@/features/ai/AiChatPanel";
import { NotebookPanel } from "@/notebooks/NotebookPanel";
import { ErdPanel } from "@/diagrams/ErdPanel";
import { SnippetsPanel } from "@/snippets/SnippetsPanel";
import { MigrationPanel } from "@/migrations/MigrationPanel";
import { TelemetryPanel } from "@/telemetry/TelemetryPanel";
import { useWorkspace } from "@/stores/workspace";
import type { WorkspacePanel } from "@/types/desktop";

const PANELS: Array<{ id: WorkspacePanel; label: string; icon: ReactNode }> = [
  { id: "ai", label: "AI", icon: <Bot className="size-3.5" /> },
  { id: "notebook", label: "Notebook", icon: <BookText className="size-3.5" /> },
  { id: "erd", label: "ERD", icon: <Network className="size-3.5" /> },
  { id: "snippets", label: "Snippets", icon: <Boxes className="size-3.5" /> },
  { id: "migrations", label: "Migrations", icon: <GitBranchPlus className="size-3.5" /> },
  { id: "telemetry", label: "Telemetry", icon: <Activity className="size-3.5" /> },
];

export function WorkspaceDock() {
  const workspaces = useWorkspace((state) => state.workspaces);
  const activeWorkspaceId = useWorkspace((state) => state.activeWorkspaceId);
  const switchWorkspace = useWorkspace((state) => state.switchWorkspace);
  const createWorkspace = useWorkspace((state) => state.createWorkspace);
  const activities = useWorkspace((state) => state.activities);
  const activePanel = useWorkspace((state) => state.layout.activePanel);
  const openPanel = useWorkspace((state) => state.openPanel);

  const workspaceActivities = activities
    .filter((activity) => activity.workspaceId === activeWorkspaceId)
    .slice(0, 8);

  return (
    <aside className="glass flex h-full w-full min-w-0 flex-col border-l border-border/60">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" /> Workspace OS
        </div>
        <div className="mt-3 flex items-center gap-2">
          <select
            value={activeWorkspaceId ?? ""}
            onChange={(event) => switchWorkspace(event.target.value)}
            className="glass-soft min-w-0 flex-1 rounded-xl border border-border/60 px-3 py-2 text-xs text-foreground outline-none"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => createWorkspace()}
            className="rounded-xl border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            New
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border/60 px-2 py-2">
        {PANELS.map((panel) => (
          <button
            key={panel.id}
            onClick={() => openPanel(panel.id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] ${
              activePanel === panel.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {panel.icon}
            <span className="hidden xl:inline">{panel.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {activePanel === "ai" ? <AiChatPanel /> : null}
        {activePanel === "notebook" ? <NotebookPanel /> : null}
        {activePanel === "erd" ? <ErdPanel /> : null}
        {activePanel === "snippets" ? <SnippetsPanel /> : null}
        {activePanel === "migrations" ? <MigrationPanel /> : null}
        {activePanel === "telemetry" ? <TelemetryPanel /> : null}
      </div>

      <div className="border-t border-border/60 px-4 py-3">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Recent activity
        </div>
        <div className="space-y-2">
          {workspaceActivities.length ? (
            workspaceActivities.map((activity) => (
              <div key={activity.id} className="text-[11px] text-muted-foreground">
                <span className="text-foreground">{activity.title}</span>
                {activity.detail ? ` · ${activity.detail}` : ""}
              </div>
            ))
          ) : (
            <div className="text-[11px] text-muted-foreground">
              Query runs, AI actions, snippets, and migration drafts will appear here.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
