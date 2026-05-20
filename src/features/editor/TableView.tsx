import { useEffect } from "react";
import { useTabs, type TableTab } from "@/stores/tabs";
import { mockExecute } from "@/mock/execute";
import { ResultsTable } from "@/features/results/ResultsTable";
import { databasesForConnection, type MockColumn } from "@/mock/schema";
import { useConnections } from "@/stores/connections";
import { Columns3, Database, KeyRound, Link2, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function TableView({ tab }: { tab: TableTab }) {
  const update = useTabs((s) => s.update);
  const { activeId, list } = useConnections();
  const conn = list.find((c) => c.id === activeId);
  const dbs = conn ? databasesForConnection(conn) : [];
  const meta = dbs.find((d) => d.name === tab.database)?.tables.find((t) => t.name === tab.table);
  const [view, setView] = useState<"data" | "structure">("data");

  const load = async () => {
    update(tab.id, { running: true });
    const result = await mockExecute(`SELECT * FROM ${tab.table} LIMIT 500`);
    update(tab.id, { running: false, result });
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
        {meta && (
          <span className="text-muted-foreground">
            · {meta.rows.toLocaleString()} rows
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
          <Structure columns={meta?.columns ?? []} />
        )}
      </div>
    </div>
  );
}

function Structure({ columns }: { columns: MockColumn[] }) {
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
            <div className="text-muted-foreground">
              {c.pk ? "PRI" : c.fk ? "FK" : ""}
            </div>
            <div className="text-muted-foreground">
              {c.fk ? `${c.fk.table}.${c.fk.column}` : (c.default ?? "")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
