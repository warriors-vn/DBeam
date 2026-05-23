import { GitBranchPlus, History, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/stores/workspace";
import { useTabs } from "@/stores/tabs";

export function MigrationPanel() {
  const migrations = useWorkspace((state) => state.migrations);
  const activeWorkspaceId = useWorkspace((state) => state.activeWorkspaceId);
  const addMigrationDraft = useWorkspace((state) => state.addMigrationDraft);
  const activeId = useTabs((state) => state.activeId);
  const tabs = useTabs((state) => state.tabs);
  const updateTab = useTabs((state) => state.update);
  const activeTab =
    tabs.find(
      (tab): tab is Extract<(typeof tabs)[number], { kind: "query" }> =>
        tab.id === activeId && tab.kind === "query",
    ) ?? null;

  const filtered = migrations.filter((migration) => migration.workspaceId === activeWorkspaceId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GitBranchPlus className="size-4 text-primary" /> Migrations
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Draft schema changes, compare rollout plans, and prepare future Git-backed migration
          workflows.
        </p>
      </div>

      <div className="border-b border-border/60 px-4 py-3 text-xs">
        <button
          onClick={() =>
            addMigrationDraft({
              title: activeTab ? `${activeTab.title} migration` : "New migration",
              rationale: "Created from the active SQL editor tab.",
              upSql: activeTab?.sql ?? "ALTER TABLE users ADD COLUMN notes TEXT NULL;",
              downSql: "-- TODO: add rollback SQL",
              status: "draft",
            })
          }
          className="w-full rounded-xl border border-border/60 px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ShieldCheck className="mr-1 inline size-3.5" /> Create draft from current SQL
        </button>
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {filtered.map((migration) => (
          <div key={migration.id} className="glass-soft rounded-2xl border border-border/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">{migration.title}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{migration.rationale}</div>
              </div>
              <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {migration.status}
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Up
                </div>
                <pre className="mono overflow-x-auto rounded-xl bg-black/20 p-3 text-[11px] text-foreground/90">
                  {migration.upSql}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Down
                </div>
                <pre className="mono overflow-x-auto rounded-xl bg-black/20 p-3 text-[11px] text-foreground/90">
                  {migration.downSql}
                </pre>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                <History className="mr-1 inline size-3" /> Updated{" "}
                {new Date(migration.updatedAt).toLocaleString()}
              </span>
              <button
                onClick={() =>
                  activeTab && updateTab(activeTab.id, { sql: migration.upSql, dirty: true })
                }
                className="rounded-full border border-border/60 px-2.5 py-1 hover:bg-accent hover:text-foreground"
              >
                Open in editor
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
