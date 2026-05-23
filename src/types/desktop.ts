export type DatabaseEngine = "mysql" | "postgresql" | "mongodb" | "redis";

export type QueryCell = string | number | boolean | null | Record<string, unknown> | Array<unknown>;

export interface RuntimeHealth {
  ok: true;
  name: string;
  version: string;
  platform: string;
  native: boolean;
  uptimeSec: number;
}

export interface ConnectionSummary {
  id: string;
  name: string;
  engine: DatabaseEngine;
  host: string;
  port: number;
  username: string;
  database: string;
  ssl: boolean;
  color?: string;
  group?: string | null;
  tags: string[];
  favorite: boolean;
  autoReconnect: boolean;
  createdAt: number;
  lastUsedAt?: number | null;
}

export interface ConnectionDetails extends ConnectionSummary {
  password?: string;
}

export interface ConnectionInput {
  id?: string;
  name: string;
  engine: DatabaseEngine;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  color?: string;
  group?: string | null;
  tags: string[];
  favorite: boolean;
  autoReconnect: boolean;
}

export interface ConnectionSession {
  connectionId: string;
  name: string;
  engine: DatabaseEngine;
  connectedAt: number;
}

export interface QueryColumn {
  name: string;
  type: string;
}

export interface QueryResult {
  columns: QueryColumn[];
  rows: QueryCell[][];
  rowCount: number;
  affected?: number;
  durationMs: number;
  message?: string;
}

export interface TableInfo {
  name: string;
  kind: "table" | "view";
  rows: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  pk: boolean;
  fk: { table: string; column: string } | null;
}

export interface SchemaCatalogDatabase {
  name: string;
  tables: TableInfo[];
  procedures: string[];
}

export interface QueryHistoryEntry {
  id: string;
  connectionId: string;
  sql: string;
  ranAt: number;
  durationMs: number;
  rowCount: number;
  ok: boolean;
}

export interface DesktopEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  ts: number;
}

export interface AppPreferences {
  theme: "dark" | "light";
  fontSize: number;
  minimap: boolean;
  resultDensity: "compact" | "comfortable";
  reducedMotion: boolean;
  vimMode: boolean;
}

export type TabKind = "query" | "table";

export interface BaseTab {
  id: string;
  kind: TabKind;
  title: string;
  dirty?: boolean;
  sticky?: boolean;
  connectionId?: string | null;
}

export interface QueryTabState extends BaseTab {
  kind: "query";
  sql: string;
  result?: QueryResult;
  running?: boolean;
  error?: string;
}

export interface TableTabState extends BaseTab {
  kind: "table";
  database: string;
  table: string;
  result?: QueryResult;
  running?: boolean;
}

export type WorkspaceTabState = QueryTabState | TableTabState;
