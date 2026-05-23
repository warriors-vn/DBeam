import { useEffect } from "react";
import { useTabs, type TableTab } from "@/stores/tabs";
import { ResultsTable } from "@/features/results/ResultsTable";
import { useConnections } from "@/stores/connections";
import { Columns3, Database, KeyRound, Link2, Network, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { bridge, isTauriDesktop } from "@/services/bridge";
import { useColumns } from "@/services/queries";
import type { ColumnInfo } from "@/types/desktop";
import { useWorkspace } from "@/stores/workspace";

function quoteIdentifier(value: string) {
  return "`" + value.replace(/`/g, "``") + "`";
}

export function TableView({ tab }: { tab: TableTab }) {
  const update = useTabs((s) => s.update);
  const activePoolId = useConnections((s) => s.activePoolId);
  const activeConnId = useConnections((s) => s.activeId);
  const columnsQuery = useColumns(activePoolId, tab.database, tab.table);
  const openPanel = useWorkspace((state) => state.openPanel);
  const addActivity = useWorkspace((state) => state.addActivity);
  const recordQueryMetric = useWorkspace((state) => state.recordQueryMetric);
  const [view, setView] = useState<"data" | "structure">("data");

  const load = async () => {
    if (isTauriDesktop() && !activePoolId) {
      update(tab.id, { running: false, result: undefined });
      return;
    }

    update(tab.id, { running: true });
    const result = await bridge.execute(
      activePoolId ?? "preview",
      `SELECT * FROM ${quoteIdentifier(tab.database)}.${quoteIdentifier(tab.table)} LIMIT 500`,
      tab.id,
    );
    update(tab.id, { running: false, result });
    recordQueryMetric({
      connectionId: activeConnId,
      tabId: tab.id,
      sql: `SELECT * FROM ${tab.database}.${tab.table} LIMIT 500`,
      durationMs: result.durationMs,
      rowCount: result.rowCount,
      kind: "table",
    });
    addActivity({
      kind: "query",
      title: `Loaded ${tab.table}`,
      detail: `${result.rowCount.toLocaleString()} rows · ${result.durationMs}ms`,
      tabId: tab.id,
      connectionId: activeConnId,
    });
  };

  useEffect(() => {
    if (!tab.result) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="glass flex h-10 shrink-0 items-center gap-2 border-b border-border/40 px-3 text-xs">
        <Database className="size-3.5 text-primary/80" />
        <span className="text-muted-foreground">{tab.database}</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground">{tab.table}</span>
        {tab.result && (
          <span className="text-muted-foreground">
            · {tab.result.rowCount.toLocaleString()} rows loaded
          </span>
        )}
        <div className="ml-4 flex items-center gap-0.5 rounded-md bg-white/5 p-0.5">
          {(["data", "structure"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded px-2 py-0.5 capitalize",
                view === v
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => openPanel("erd")}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Network className="size-3.5" /> ERD
            </button>
            <button
              onClick={load}
              disabled={tab.running}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {tab.running ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {view === "data" ? (
          tab.result ? (
            <ResultsTable result={tab.result} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-3.5 animate-spin" /> Loading…
            </div>
          )
        ) : (
          <Structure columns={columnsQuery.data?.columns ?? []} />
        )}
      </div>
    </div>
  );
}

function Structure({ columns }: { columns: ColumnInfo[] }) {
  return (
    <div className="scrollbar-thin h-full overflow-auto p-4 text-xs">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <Columns3 className="size-3.5" /> {columns.length} columns
      </div>
      <div className="glass-soft overflow-hidden rounded-lg">
        <div className="grid grid-cols-[1.5fr_1.5fr_0.6fr_0.6fr_2fr] border-b border-border/60 bg-white/[0.03] px-3 py-2 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          <div>Column</div>
          <div>Type</div>
          <div>Null</div>
          <div>Key</div>
          <div>Default / Refs</div>
        </div>
        {columns.map((c) => (
          <div
            key={c.name}
            className="grid grid-cols-[1.5fr_1.5fr_0.6fr_0.6fr_2fr] items-center border-b border-border/30 px-3 py-1.5 last:border-b-0"
          >
            <div className="mono flex items-center gap-1.5 text-foreground">
              {c.pk && <KeyRound className="size-3 text-amber-300" />}
              {c.fk && <Link2 className="size-3 text-sky-300" />}
              {c.name}
            </div>
            <div className="mono text-muted-foreground">{c.type}</div>
            <div className="text-muted-foreground">{c.nullable ? "YES" : "NO"}</div>
            <div className="text-muted-foreground">{c.pk ? "PRI" : c.fk ? "FK" : ""}</div>
            <div className="text-muted-foreground">
              {c.fk ? `${c.fk.table}.${c.fk.column}` : (c.default ?? "")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
