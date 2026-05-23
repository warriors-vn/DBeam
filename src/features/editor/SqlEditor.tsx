import Editor, { type OnMount } from "@monaco-editor/react";
import { useUI } from "@/stores/ui";
import { useTabs, type QueryTab } from "@/stores/tabs";
import { mockExecute } from "@/mock/execute";
import { useCallback, useRef } from "react";
import { Play, Wand2, History, Loader2 } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { uid } from "@/lib/id";
import { useConnections } from "@/stores/connections";
import { ResultsTable } from "@/features/results/ResultsTable";
import { bridge } from "@/services/bridge";

function formatSql(sql: string) {
  return sql
    .replace(/\s+/g, " ")
    .replace(
      /\b(select|from|where|group by|order by|limit|insert into|values|update|set|delete from|join|left join|right join|inner join|on|and|or|having)\b/gi,
      (m) => `\n${m.toUpperCase()}`,
    )
    .replace(/^\n/, "")
    .trim() + ";";
}

export function SqlEditor({ tab }: { tab: QueryTab }) {
  const { fontSize, minimap } = useUI();
  const useBridge = useUI((s) => s.useBridge);
  const update = useTabs((s) => s.update);
  const activeConn = useConnections((s) => s.activeId);
  const activePool = useConnections((s) => s.activePoolId);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const run = useCallback(async () => {
    update(tab.id, { running: true, error: undefined });
    const started = performance.now();
    try {
      const result =
        useBridge && activePool
          ? await bridge.execute(activePool, tab.sql, tab.id)
          : await mockExecute(tab.sql);
      update(tab.id, { running: false, result, dirty: false });
      if (db && activeConn) {
        await db.history.add({
          id: uid(),
          connectionId: activeConn,
          sql: tab.sql,
          ranAt: Date.now(),
          durationMs: Math.round(performance.now() - started),
          rowCount: result.rowCount,
          ok: true,
        });
      }
    } catch (e) {
      update(tab.id, { running: false, error: (e as Error).message });
    }
  }, [tab.id, tab.sql, update, activeConn, useBridge, activePool]);

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
          onClick={() =>
            update(tab.id, { sql: formatSql(tab.sql), dirty: true })
          }
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Wand2 className="size-3.5" /> Format
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          title="History"
        >
          <History className="size-3.5" /> History
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
            onChange={(v) =>
              update(tab.id, { sql: v ?? "", dirty: true })
            }
            onMount={handleMount}
            options={{
              fontSize,
              fontFamily:
                "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
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
