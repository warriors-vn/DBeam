import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Background, Controls, MarkerType, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Network } from "lucide-react";
import { bridge } from "@/services/bridge";
import { bridgeKeys, useExplorerCatalog } from "@/services/queries";
import { useConnections } from "@/stores/connections";
import { buildDiagram } from "./layout";

export function ErdPanel() {
  const activePoolId = useConnections((state) => state.activePoolId);
  const { databases } = useExplorerCatalog(activePoolId);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const databaseName = selectedDb ?? databases[0]?.name ?? null;
  const database = databases.find((entry) => entry.name === databaseName) ?? null;
  const tables = useMemo(
    () => database?.tables.filter((table) => table.kind === "table").slice(0, 12) ?? [],
    [database],
  );

  const columnQueries = useQueries({
    queries: tables.map((table) => ({
      queryKey: bridgeKeys.columns(activePoolId ?? "none", databaseName ?? "none", table.name),
      queryFn: () => bridge.columns(activePoolId!, databaseName!, table.name),
      enabled: !!activePoolId && !!databaseName,
      staleTime: 60_000,
    })),
  });

  const columnsByTable = useMemo(
    () =>
      Object.fromEntries(
        tables.map((table, index) => [table.name, columnQueries[index]?.data?.columns ?? []]),
      ),
    [columnQueries, tables],
  );

  const diagram = useMemo(() => buildDiagram(columnsByTable), [columnsByTable]);

  const nodes = useMemo(
    () =>
      diagram.nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: {
          label: (
            <div className="rounded-2xl border border-border/60 bg-[oklch(0.22_0.014_260_/_0.92)] px-3 py-2 shadow-xl">
              <div className="mb-1 text-xs font-semibold text-foreground">{node.label}</div>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                {node.columns.slice(0, 5).map((column) => (
                  <div key={column.name} className="flex items-center justify-between gap-4">
                    <span className="mono text-foreground/90">{column.name}</span>
                    <span>{column.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        type: "default",
      })),
    [diagram.nodes],
  );

  const edges = useMemo(
    () =>
      diagram.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
      })),
    [diagram.edges],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Network className="size-4 text-primary" /> ERD Explorer
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Relationship graph with live schema awareness, ready for future collaborative diagram
          editing.
        </p>
      </div>

      <div className="border-b border-border/60 px-4 py-3">
        <select
          value={databaseName ?? ""}
          onChange={(event) => setSelectedDb(event.target.value || null)}
          className="glass-soft w-full rounded-xl border border-border/60 px-3 py-2 text-xs text-foreground outline-none"
        >
          {databases.map((databaseEntry) => (
            <option key={databaseEntry.name} value={databaseEntry.name}>
              {databaseEntry.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1">
        {nodes.length ? (
          <ReactFlow fitView nodes={nodes} edges={edges}>
            <MiniMap />
            <Controls />
            <Background gap={18} size={1} />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
            Connect to a database and load table metadata to visualize the schema graph.
          </div>
        )}
      </div>
    </div>
  );
}
