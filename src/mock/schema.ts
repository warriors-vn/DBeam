import type { Connection } from "@/lib/db/dexie";

export interface MockColumn {
  name: string;
  type: string;
  nullable: boolean;
  pk?: boolean;
  fk?: { table: string; column: string };
  default?: string | null;
}
export interface MockTable {
  name: string;
  kind: "table" | "view";
  rows: number;
  columns: MockColumn[];
}
export interface MockDatabase {
  name: string;
  tables: MockTable[];
  procedures: string[];
}

const t = (
  name: string,
  rows: number,
  columns: MockColumn[],
  kind: MockTable["kind"] = "table",
): MockTable => ({ name, rows, kind, columns });

const id = (): MockColumn => ({ name: "id", type: "bigint", nullable: false, pk: true });
const ts = (name = "created_at"): MockColumn => ({ name, type: "timestamp", nullable: false, default: "CURRENT_TIMESTAMP" });

export const mockDatabases: MockDatabase[] = [
  {
    name: "acme_production",
    procedures: ["sp_refresh_metrics", "sp_purge_sessions"],
    tables: [
      t("users", 12483, [
        id(),
        { name: "email", type: "varchar(255)", nullable: false },
        { name: "name", type: "varchar(120)", nullable: true },
        { name: "plan", type: "enum('free','pro','team')", nullable: false, default: "free" },
        { name: "is_active", type: "tinyint(1)", nullable: false, default: "1" },
        ts(),
      ]),
      t("orders", 58210, [
        id(),
        { name: "user_id", type: "bigint", nullable: false, fk: { table: "users", column: "id" } },
        { name: "total_cents", type: "int", nullable: false },
        { name: "currency", type: "char(3)", nullable: false, default: "USD" },
        { name: "status", type: "varchar(20)", nullable: false },
        ts(),
      ]),
      t("products", 842, [
        id(),
        { name: "sku", type: "varchar(64)", nullable: false },
        { name: "name", type: "varchar(255)", nullable: false },
        { name: "price_cents", type: "int", nullable: false },
        { name: "stock", type: "int", nullable: false, default: "0" },
      ]),
      t("sessions", 230410, [
        id(),
        { name: "user_id", type: "bigint", nullable: false, fk: { table: "users", column: "id" } },
        { name: "ip", type: "varchar(45)", nullable: true },
        { name: "user_agent", type: "text", nullable: true },
        ts("started_at"),
      ]),
      t("v_active_users", 8120, [
        { name: "user_id", type: "bigint", nullable: false },
        { name: "last_seen", type: "timestamp", nullable: false },
      ], "view"),
    ],
  },
  {
    name: "acme_analytics",
    procedures: [],
    tables: [
      t("events", 1923840, [
        id(),
        { name: "name", type: "varchar(80)", nullable: false },
        { name: "user_id", type: "bigint", nullable: true },
        { name: "props", type: "json", nullable: true },
        ts(),
      ]),
      t("daily_rollup", 730, [
        { name: "day", type: "date", nullable: false, pk: true },
        { name: "active_users", type: "int", nullable: false },
        { name: "revenue_cents", type: "bigint", nullable: false },
      ]),
    ],
  },
];

export function databasesForConnection(_conn: Connection): MockDatabase[] {
  // For MVP every connection sees the same mock catalog
  return mockDatabases;
}
