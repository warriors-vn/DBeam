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

export type WorkspacePanel = "ai" | "notebook" | "erd" | "snippets" | "migrations" | "telemetry";

export interface WorkspaceSummary {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
}

export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  kind: "query" | "ai" | "snippet" | "migration" | "notebook" | "workspace" | "diagram";
  title: string;
  detail?: string;
  ts: number;
  tabId?: string | null;
  connectionId?: string | null;
}

export type AiProviderId = "mock-openai" | "openai" | "claude" | "ollama" | "local";

export type AiActionKind = "insert-sql" | "create-snippet" | "create-migration" | "append-note";

export interface AiAction {
  id: string;
  kind: AiActionKind;
  label: string;
  payload: string;
  description?: string;
}

export interface AiMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: number;
  status?: "streaming" | "ready" | "error";
  actions?: AiAction[];
}

export interface AiThread {
  id: string;
  workspaceId: string;
  title: string;
  providerId: AiProviderId;
  connectionId?: string | null;
  tabId?: string | null;
  messages: AiMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AiContextSnapshot {
  workspaceName: string;
  connectionName?: string;
  tabTitle?: string;
  sql?: string;
  schemaSummary?: string[];
  resultPreview?: string;
}

export type NotebookBlockType = "heading" | "markdown" | "sql" | "result" | "callout";

export interface NotebookBlock {
  id: string;
  type: NotebookBlockType;
  content: string;
  collapsed?: boolean;
  queryResult?: QueryResult;
  createdAt: number;
}

export interface NotebookDocument {
  id: string;
  workspaceId: string;
  title: string;
  blocks: NotebookBlock[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceSnippet {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  sql: string;
  folder: string;
  tags: string[];
  variables: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MigrationDraft {
  id: string;
  workspaceId: string;
  title: string;
  rationale: string;
  upSql: string;
  downSql: string;
  status: "draft" | "review" | "ready" | "applied";
  createdAt: number;
  updatedAt: number;
}

export interface DiagramNode {
  id: string;
  label: string;
  database: string;
  kind: "table" | "view";
  columns: ColumnInfo[];
  position: { x: number; y: number };
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface QueryTelemetryEntry {
  id: string;
  workspaceId: string;
  connectionId?: string | null;
  tabId?: string | null;
  sql: string;
  durationMs: number;
  rowCount: number;
  ts: number;
  kind: "query" | "table";
}

export interface TelemetrySnapshot {
  totalQueries: number;
  slowQueries: number;
  avgDurationMs: number;
  totalRowsObserved: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status: "ready" | "planned";
  hooks: Array<"command" | "sidebar" | "editor" | "telemetry" | "ai">;
}

export interface WorkspaceLayoutState {
  panelOpen: boolean;
  activePanel: WorkspacePanel;
  dockWidth: number;
}

export interface WorkspacePersistedState {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  layout: WorkspaceLayoutState;
  threads: AiThread[];
  notebooks: NotebookDocument[];
  snippets: WorkspaceSnippet[];
  migrations: MigrationDraft[];
  activities: WorkspaceActivity[];
  telemetry: QueryTelemetryEntry[];
  plugins: PluginManifest[];
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
