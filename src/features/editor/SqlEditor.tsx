import Editor, { type OnMount } from "@monaco-editor/react";
import { useUI } from "@/stores/ui";
import { useTabs, type QueryTab } from "@/stores/tabs";
import { useCallback, useRef } from "react";
import { Bot, BookText, GitBranchPlus, Play, Wand2, History, Loader2 } from "lucide-react";
import { useConnections } from "@/stores/connections";
import { ResultsTable } from "@/features/results/ResultsTable";
import { bridge, isTauriDesktop, notifyDesktop } from "@/services/bridge";
import { toast } from "sonner";
import { useWorkspace } from "@/stores/workspace";

function formatSql(sql: string) {
  return (
    sql
      .replace(/\s+/g, " ")
      .replace(
        /\b(select|from|where|group by|order by|limit|insert into|values|update|set|delete from|join|left join|right join|inner join|on|and|or|having)\b/gi,
        (m) => `\n${m.toUpperCase()}`,
      )
      .replace(/^\n/, "")
      .trim() + ";"
  );
}

export function SqlEditor({ tab }: { tab: QueryTab }) {
  const { fontSize, minimap } = useUI();
  const update = useTabs((s) => s.update);
  const activeConn = useConnections((s) => s.activeId);
  const activePool = useConnections((s) => s.activePoolId);
  const openPanel = useWorkspace((state) => state.openPanel);
  const appendNotebookBlock = useWorkspace((state) => state.appendNotebookBlock);
  const addMigrationDraft = useWorkspace((state) => state.addMigrationDraft);
  const addActivity = useWorkspace((state) => state.addActivity);
  const recordQueryMetric = useWorkspace((state) => state.recordQueryMetric);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const run = useCallback(async () => {
    update(tab.id, { running: true, error: undefined });
    try {
      const connectionId = activePool ?? activeConn ?? "preview";
      if (isTauriDesktop() && !activePool) {
        throw new Error("Connect to a database before running a query");
      }

      const result = await bridge.execute(connectionId, tab.sql, tab.id);
      update(tab.id, { running: false, result, dirty: false });
      recordQueryMetric({
        connectionId: activeConn,
        tabId: tab.id,
        sql: tab.sql,
        durationMs: result.durationMs,
        rowCount: result.rowCount,
        kind: "query",
      });
      addActivity({
        kind: "query",
        title: `Ran ${tab.title}`,
        detail: `${result.rowCount.toLocaleString()} rows · ${result.durationMs}ms`,
        tabId: tab.id,
        connectionId: activeConn,
      });
      if (result.durationMs > 1200) {
        void notifyDesktop(
          "Query completed",
          `${result.rowCount.toLocaleString()} rows in ${result.durationMs}ms`,
        );
      }
    } catch (e) {
      const message = (e as Error).message;
      update(tab.id, { running: false, error: message });
      toast.error(message);
      void notifyDesktop("Query failed", message);
    }
  }, [activeConn, activePool, addActivity, recordQueryMetric, tab.id, tab.sql, tab.title, update]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      void run();
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="glass flex h-9 shrink-0 items-center gap-1 border-b border-border/40 px-2">
        <button
          onClick={run}
          disabled={tab.running}
          className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {tab.running ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          Run
          <span className="ml-2 flex items-center gap-1 opacity-80">
            <span className="kbd">⌘</span>
            <span className="kbd">↵</span>
          </span>
        </button>
        <button
          onClick={() => update(tab.id, { sql: formatSql(tab.sql), dirty: true })}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Wand2 className="size-3.5" /> Format
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          title="History"
          onClick={() => openPanel("telemetry")}
        >
          <History className="size-3.5" /> History
        </button>
        <button
          onClick={() => openPanel("ai")}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Bot className="size-3.5" /> Ask AI
        </button>
        <button
          onClick={() => {
            appendNotebookBlock({ type: "sql", content: tab.sql });
            openPanel("notebook");
          }}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <BookText className="size-3.5" /> Notebook
        </button>
        <button
          onClick={() => {
            addMigrationDraft({
              title: `${tab.title} migration`,
              rationale: "Captured directly from the SQL editor.",
              upSql: tab.sql,
              downSql: "-- TODO: add rollback SQL",
              status: "draft",
            });
            openPanel("migrations");
          }}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <GitBranchPlus className="size-3.5" /> Migration
        </button>
        <div className="ml-auto text-[11px] text-muted-foreground">
          {tab.result
            ? `${tab.result.rowCount.toLocaleString()} rows · ${tab.result.durationMs} ms`
            : "Ready"}
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="min-h-0">
          <Editor
            height="100%"
            language="sql"
            theme="vs-dark"
            value={tab.sql}
            onChange={(v) => update(tab.id, { sql: v ?? "", dirty: true })}
            onMount={handleMount}
            options={{
              fontSize,
              fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
              fontLigatures: true,
              minimap: { enabled: minimap },
              scrollBeyondLastLine: false,
              renderLineHighlight: "gutter",
              roundedSelection: true,
              padding: { top: 12 },
              smoothScrolling: true,
              cursorBlinking: "smooth",
              tabSize: 2,
            }}
          />
        </div>
        <div className="min-h-0 border-t border-border/60">
          {tab.error ? (
            <div className="mono p-4 text-xs text-destructive">{tab.error}</div>
          ) : tab.result ? (
            <ResultsTable result={tab.result} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Run a query to see results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
