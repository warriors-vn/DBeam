import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import type { QueryResult } from "@/mock/execute";
import { useUI } from "@/stores/ui";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResultsTable({ result }: { result: QueryResult }) {
  const { resultDensity } = useUI();
  const parentRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<{ col: number; dir: "asc" | "desc" } | null>(null);
  const [widths, setWidths] = useState<number[]>(() =>
    result.columns.map(() => 160),
  );

  const rows = useMemo(() => {
    if (!sort) return result.rows;
    const copy = [...result.rows];
    copy.sort((a, b) => {
      const av = a[sort.col];
      const bv = b[sort.col];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av > bv ? 1 : av < bv ? -1 : 0) * (sort.dir === "asc" ? 1 : -1);
    });
    return copy;
  }, [result.rows, sort]);

  const rowHeight = resultDensity === "compact" ? 26 : 32;
  const v = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  function exportCsv() {
    const head = result.columns.map((c) => c.name).join(",");
    const body = rows
      .map((r) =>
        r
          .map((v) =>
            v == null
              ? ""
              : `"${String(v).replace(/"/g, '""')}"`,
          )
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${head}\n${body}`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "results.csv";
    a.click();
  }

  function startResize(idx: number, e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widths[idx];
    const move = (ev: MouseEvent) => {
      setWidths((ws) => {
        const next = [...ws];
        next[idx] = Math.max(60, startW + (ev.clientX - startX));
        return next;
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  if (!result.columns.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        {result.message ?? "Query OK"}
        {result.affected != null && ` · ${result.affected} affected`}
      </div>
    );
  }

  const totalWidth = widths.reduce((s, w) => s + w, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-3 text-[11px] text-muted-foreground">
        <span>
          {rows.length.toLocaleString()} rows · {result.durationMs} ms
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
          >
            <Download className="size-3" /> CSV
          </button>
        </div>
      </div>
      <div
        ref={parentRef}
        className="scrollbar-thin relative flex-1 overflow-auto mono text-xs"
      >
        <div style={{ width: totalWidth }}>
          <div className="glass-soft sticky top-0 z-10 flex border-b border-border/60">
            {result.columns.map((c, i) => {
              const isSorted = sort?.col === i;
              return (
                <div
                  key={c.name}
                  style={{ width: widths[i] }}
                  className="relative flex items-center gap-1 px-2 py-1.5 text-left"
                >
                  <button
                    onClick={() =>
                      setSort((s) =>
                        s?.col === i && s.dir === "asc"
                          ? { col: i, dir: "desc" }
                          : { col: i, dir: "asc" },
                      )
                    }
                    className="flex min-w-0 items-center gap-1 truncate text-foreground hover:text-primary"
                  >
                    <span className="truncate font-medium">{c.name}</span>
                    {isSorted && sort.dir === "asc" && (
                      <ArrowUp className="size-3" />
                    )}
                    {isSorted && sort.dir === "desc" && (
                      <ArrowDown className="size-3" />
                    )}
                  </button>
                  <span className="ml-1 truncate text-[10px] text-muted-foreground">
                    {c.type}
                  </span>
                  <div
                    onMouseDown={(e) => startResize(i, e)}
                    className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary/40"
                  />
                </div>
              );
            })}
          </div>
          <div
            style={{ height: v.getTotalSize(), position: "relative" }}
          >
            {v.getVirtualItems().map((vr) => {
              const row = rows[vr.index];
              return (
                <div
                  key={vr.key}
                  className={cn(
                    "absolute top-0 left-0 flex w-full border-b border-border/30",
                    vr.index % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]",
                  )}
                  style={{
                    height: vr.size,
                    transform: `translateY(${vr.start}px)`,
                  }}
                >
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      style={{ width: widths[ci] }}
                      className="flex items-center truncate px-2 text-foreground/90"
                      title={cell == null ? "NULL" : String(cell)}
                    >
                      {cell == null ? (
                        <span className="rounded bg-white/5 px-1 text-[10px] text-muted-foreground italic">
                          NULL
                        </span>
                      ) : typeof cell === "boolean" ? (
                        <span
                          className={cn(
                            "rounded px-1 text-[10px]",
                            cell
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-rose-400/10 text-rose-300",
                          )}
                        >
                          {String(cell)}
                        </span>
                      ) : (
                        <span className="truncate">{String(cell)}</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
