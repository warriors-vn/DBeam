import { uid } from "@/lib/id";
import type {
  MigrationDraft,
  NotebookDocument,
  PluginManifest,
  WorkspaceLayoutState,
  WorkspacePersistedState,
  WorkspaceSnippet,
  WorkspaceSummary,
} from "@/types/desktop";

export function createDefaultWorkspace(name = "Personal Lab"): WorkspaceSummary {
  const now = Date.now();
  return {
    id: uid(),
    name,
    description: "AI-native workspace for analysis, migrations, and collaborative prep.",
    color: "#6aa6ff",
    icon: "sparkles",
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
}

export function createDefaultNotebook(workspaceId: string): NotebookDocument {
  const now = Date.now();
  return {
    id: uid(),
    workspaceId,
    title: "Investigation Notebook",
    createdAt: now,
    updatedAt: now,
    blocks: [
      {
        id: uid(),
        type: "heading",
        content: "Workspace Notes",
        createdAt: now,
      },
      {
        id: uid(),
        type: "markdown",
        content: "Capture findings, AI recommendations, and query workflows here.",
        createdAt: now,
      },
    ],
  };
}

export function defaultSnippets(workspaceId: string): WorkspaceSnippet[] {
  const now = Date.now();
  return [
    {
      id: uid(),
      workspaceId,
      title: "Pagination template",
      description: "Cursor-friendly pagination scaffold",
      sql: "SELECT *\nFROM users\nORDER BY id DESC\nLIMIT {{limit}} OFFSET {{offset}};",
      folder: "Templates",
      tags: ["pagination", "template"],
      variables: ["limit", "offset"],
      favorite: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      workspaceId,
      title: "Slow query triage",
      description: "Inspect long-running statements by table and time window",
      sql: "SELECT *\nFROM query_history\nWHERE duration_ms > {{threshold_ms}}\nORDER BY ran_at DESC\nLIMIT 50;",
      folder: "Ops",
      tags: ["perf", "ops"],
      variables: ["threshold_ms"],
      favorite: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function defaultMigrations(workspaceId: string): MigrationDraft[] {
  const now = Date.now();
  return [
    {
      id: uid(),
      workspaceId,
      title: "Add last_seen_at to users",
      rationale: "Prepare richer activity tracking for workspace analytics.",
      upSql: "ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP NULL;",
      downSql: "ALTER TABLE users DROP COLUMN last_seen_at;",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function defaultPlugins(): PluginManifest[] {
  return [
    {
      id: "redis-viewer",
      name: "Redis Viewer",
      description: "Planned cache explorer plugin surface.",
      enabled: false,
      status: "planned",
      hooks: ["sidebar", "command"],
    },
    {
      id: "graphql-explorer",
      name: "GraphQL Explorer",
      description: "Planned API + schema exploration extension.",
      enabled: false,
      status: "planned",
      hooks: ["command", "editor"],
    },
    {
      id: "telemetry-inspector",
      name: "Telemetry Inspector",
      description: "Internal plugin hook for workspace metrics and observability.",
      enabled: true,
      status: "ready",
      hooks: ["telemetry", "command"],
    },
  ];
}

export const defaultWorkspaceLayout: WorkspaceLayoutState = {
  panelOpen: true,
  activePanel: "ai",
  dockWidth: 420,
};

export function createDefaultWorkspaceState(): WorkspacePersistedState {
  const workspace = createDefaultWorkspace();
  return {
    workspaces: [workspace],
    activeWorkspaceId: workspace.id,
    layout: defaultWorkspaceLayout,
    threads: [],
    notebooks: [createDefaultNotebook(workspace.id)],
    snippets: defaultSnippets(workspace.id),
    migrations: defaultMigrations(workspace.id),
    activities: [],
    telemetry: [],
    plugins: defaultPlugins(),
  };
}
