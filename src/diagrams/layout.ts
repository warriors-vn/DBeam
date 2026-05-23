import type { ColumnInfo, DiagramEdge, DiagramNode } from "@/types/desktop";

export function buildDiagram(columnsByTable: Record<string, ColumnInfo[]>) {
  const tableNames = Object.keys(columnsByTable);
  const nodes: DiagramNode[] = tableNames.map((tableName, index) => ({
    id: tableName,
    label: tableName,
    database: "",
    kind: "table",
    columns: columnsByTable[tableName] ?? [],
    position: {
      x: 60 + (index % 3) * 280,
      y: 40 + Math.floor(index / 3) * 220,
    },
  }));

  const edges: DiagramEdge[] = tableNames.flatMap((tableName) =>
    (columnsByTable[tableName] ?? [])
      .filter((column) => column.fk)
      .map((column) => ({
        id: `${tableName}:${column.name}`,
        source: tableName,
        target: column.fk!.table,
        label: `${column.name} → ${column.fk!.table}.${column.fk!.column}`,
      })),
  );

  return { nodes, edges };
}
