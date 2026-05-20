import { mockDatabases } from "./schema";

export interface QueryColumn {
  name: string;
  type: string;
}
export interface QueryResult {
  columns: QueryColumn[];
  rows: Array<Array<string | number | null | boolean>>;
  rowCount: number;
  durationMs: number;
  affected?: number;
  message?: string;
}

function gen(n: number, cols: QueryColumn[]): QueryResult["rows"] {
  const rows: QueryResult["rows"] = [];
  for (let i = 0; i < n; i++) {
    rows.push(
      cols.map((c) => {
        if (/id$/i.test(c.name)) return i + 1;
        if (/email/i.test(c.name)) return `user${i + 1}@acme.io`;
        if (/name/i.test(c.name)) return ["Ada", "Linus", "Grace", "Dennis", "Margaret"][i % 5] + ` ${i + 1}`;
        if (/price|total|cents|revenue/i.test(c.name)) return Math.round(Math.random() * 50000);
        if (/status/i.test(c.name)) return ["paid", "pending", "refunded", "failed"][i % 4];
        if (/plan/i.test(c.name)) return ["free", "pro", "team"][i % 3];
        if (/active|is_/i.test(c.name)) return Math.random() > 0.2;
        if (/created|started|_at$/i.test(c.name))
          return new Date(Date.now() - i * 86_400_000).toISOString();
        if (/json|props/i.test(c.name)) return JSON.stringify({ k: i });
        if (i % 9 === 0) return null;
        return `${c.name}_${i + 1}`;
      }),
    );
  }
  return rows;
}

export async function mockExecute(sql: string): Promise<QueryResult> {
  const started = performance.now();
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 320));
  const lower = sql.trim().toLowerCase();

  if (!lower) {
    return { columns: [], rows: [], rowCount: 0, durationMs: 0, message: "Empty query" };
  }

  // SELECT * FROM <table> [LIMIT n]
  const m = lower.match(/from\s+`?(\w+)`?/);
  if (lower.startsWith("select") && m) {
    const tableName = m[1];
    const limitMatch = lower.match(/limit\s+(\d+)/);
    const limit = limitMatch ? Math.min(parseInt(limitMatch[1], 10), 5000) : 200;
    for (const db of mockDatabases) {
      const t = db.tables.find((x) => x.name === tableName);
      if (t) {
        const columns: QueryColumn[] = t.columns.map((c) => ({ name: c.name, type: c.type }));
        return {
          columns,
          rows: gen(Math.min(limit, t.rows), columns),
          rowCount: Math.min(limit, t.rows),
          durationMs: Math.round(performance.now() - started),
        };
      }
    }
  }

  if (lower.startsWith("show tables")) {
    const columns = [{ name: "Tables_in_db", type: "varchar" }];
    const rows = mockDatabases.flatMap((d) => d.tables.map((t) => [t.name]));
    return { columns, rows, rowCount: rows.length, durationMs: Math.round(performance.now() - started) };
  }

  if (/^(insert|update|delete)/i.test(lower)) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      affected: Math.floor(Math.random() * 5) + 1,
      durationMs: Math.round(performance.now() - started),
      message: "OK",
    };
  }

  // Generic fallback
  const columns: QueryColumn[] = [
    { name: "id", type: "bigint" },
    { name: "value", type: "varchar" },
    { name: "created_at", type: "timestamp" },
  ];
  return {
    columns,
    rows: gen(50, columns),
    rowCount: 50,
    durationMs: Math.round(performance.now() - started),
  };
}
