import { BookText, Database, FileText, Plus, SigmaSquare } from "lucide-react";
import { useWorkspace } from "@/stores/workspace";
import { useTabs } from "@/stores/tabs";

export function NotebookPanel() {
  const notebook = useWorkspace((state) => state.activeNotebook());
  const createNotebook = useWorkspace((state) => state.createNotebook);
  const appendNotebookBlock = useWorkspace((state) => state.appendNotebookBlock);
  const updateNotebookBlock = useWorkspace((state) => state.updateNotebookBlock);
  const activeId = useTabs((state) => state.activeId);
  const tabs = useTabs((state) => state.tabs);
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? null;

  if (!notebook) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <button
          onClick={() => createNotebook()}
          className="glass-soft rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          Create notebook
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BookText className="size-4 text-primary" /> {notebook.title}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Block-based SQL notebook for investigations, AI notes, and saved result narratives.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-xs">
        <button
          onClick={() =>
            appendNotebookBlock({ type: "markdown", content: "New markdown block" }, notebook.id)
          }
          className="rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <FileText className="mr-1 inline size-3" /> Markdown
        </button>
        <button
          onClick={() =>
            appendNotebookBlock(
              {
                type: "sql",
                content:
                  activeTab?.kind === "query" ? activeTab.sql : "SELECT * FROM users LIMIT 100;",
              },
              notebook.id,
            )
          }
          className="rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Database className="mr-1 inline size-3" /> SQL block
        </button>
        <button
          onClick={() =>
            activeTab?.result &&
            appendNotebookBlock(
              {
                type: "result",
                content: `${activeTab.title} · ${activeTab.result.rowCount} rows`,
                queryResult: activeTab.result,
              },
              notebook.id,
            )
          }
          className="rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <SigmaSquare className="mr-1 inline size-3" /> Result block
        </button>
        <button
          onClick={() => createNotebook(`Notebook ${Date.now().toString().slice(-4)}`)}
          className="ml-auto rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="mr-1 inline size-3" /> New notebook
        </button>
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {notebook.blocks.map((block) => (
          <div key={block.id} className="glass-soft rounded-2xl border border-border/60 p-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {block.type}
            </div>
            {block.type === "result" && block.queryResult ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  {block.queryResult.rowCount.toLocaleString()} rows ·{" "}
                  {block.queryResult.durationMs}ms
                </div>
                <div className="grid gap-1">
                  {block.queryResult.columns.slice(0, 5).map((column) => (
                    <div key={column.name} className="mono text-[11px] text-foreground/80">
                      {column.name} <span className="text-muted-foreground">{column.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <textarea
                value={block.content}
                onChange={(event) =>
                  updateNotebookBlock(notebook.id, block.id, { content: event.target.value })
                }
                className="min-h-24 w-full resize-y bg-transparent text-sm text-foreground outline-none"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
