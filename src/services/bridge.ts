import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { mockExecute } from "@/mock/execute";
import { mockDatabases } from "@/mock/schema";
import type {
  ColumnInfo,
  ConnectionDetails,
  ConnectionInput,
  ConnectionSession,
  ConnectionSummary,
  DesktopEvent,
  QueryHistoryEntry,
  QueryResult,
  RuntimeHealth,
  TableInfo,
} from "@/types/desktop";

const BROWSER_CONNECTIONS_KEY = "dbeam:connections";

export type BridgeHealth = RuntimeHealth;
export type BridgeQueryResult = QueryResult;
export type BridgeTableInfo = TableInfo;
export type BridgeColumnInfo = ColumnInfo;

export function isTauriDesktop() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function readBrowserConnections(): ConnectionDetails[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(BROWSER_CONNECTIONS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ConnectionDetails[];
  } catch {
    return [];
  }
}

function writeBrowserConnections(connections: ConnectionDetails[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BROWSER_CONNECTIONS_KEY, JSON.stringify(connections));
}

function toSummary(connection: ConnectionDetails): ConnectionSummary {
  const { password: _password, ...summary } = connection;
  return summary;
}

async function invokeNative<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

function browserTableLookup(database: string, table: string) {
  return mockDatabases
    .find((entry) => entry.name === database)
    ?.tables.find((entry) => entry.name === table);
}

function mapMockColumns(database: string, table: string): ColumnInfo[] {
  return (browserTableLookup(database, table)?.columns ?? []).map((column) => ({
    name: column.name,
    type: column.type,
    nullable: column.nullable,
    default: column.default ?? null,
    pk: column.pk ?? false,
    fk: column.fk ?? null,
  }));
}

function downloadBrowserFile(fileName: string, body: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([body], { type: mime });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 500);
}

export async function notifyDesktop(title: string, body: string) {
  if (!isTauriDesktop()) return;
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === "granted";
  }
  if (granted) {
    sendNotification({ title, body });
  }
}

export const bridge = {
  async health(): Promise<BridgeHealth> {
    if (!isTauriDesktop()) {
      return {
        ok: true,
        name: "dbeam-preview",
        version: "browser",
        native: false,
        platform: typeof navigator !== "undefined" ? navigator.platform : "browser",
        uptimeSec: 0,
      };
    }

    return invokeNative<BridgeHealth>("desktop_health");
  },

  async listConnections(): Promise<{ connections: ConnectionSummary[] }> {
    if (!isTauriDesktop()) {
      return { connections: readBrowserConnections().map(toSummary) };
    }

    return invokeNative("list_connections");
  },

  async getConnection(id: string): Promise<ConnectionDetails> {
    if (!isTauriDesktop()) {
      const connection = readBrowserConnections().find((entry) => entry.id === id);
      if (!connection) throw new Error("Connection not found");
      return connection;
    }

    return invokeNative("get_connection", { id });
  },

  async testConnection(connection: ConnectionInput): Promise<{ ok: true; latencyMs: number }> {
    if (!isTauriDesktop()) {
      return { ok: true, latencyMs: 48 };
    }

    return invokeNative("test_connection", { input: connection });
  },

  async saveConnection(connection: ConnectionInput): Promise<ConnectionSummary> {
    if (!isTauriDesktop()) {
      const connections = readBrowserConnections();
      const next: ConnectionDetails = {
        ...connection,
        id: connection.id ?? crypto.randomUUID(),
        createdAt: connections.find((entry) => entry.id === connection.id)?.createdAt ?? Date.now(),
        lastUsedAt: connections.find((entry) => entry.id === connection.id)?.lastUsedAt ?? null,
      };
      const nextList = connections.filter((entry) => entry.id !== next.id);
      nextList.unshift(next);
      writeBrowserConnections(nextList);
      return toSummary(next);
    }

    return invokeNative("save_connection", { input: connection });
  },

  async removeConnection(id: string): Promise<void> {
    if (!isTauriDesktop()) {
      writeBrowserConnections(readBrowserConnections().filter((entry) => entry.id !== id));
      return;
    }

    await invokeNative("remove_connection", { id });
  },

  async connect(connectionOrId: string | ConnectionInput): Promise<ConnectionSession> {
    if (!isTauriDesktop()) {
      const id = typeof connectionOrId === "string" ? connectionOrId : connectionOrId.id;
      if (!id) throw new Error("Connection id is required");
      const connection = readBrowserConnections().find((entry) => entry.id === id);
      if (!connection) throw new Error("Connection not found");
      return {
        connectionId: id,
        name: connection.name,
        engine: connection.engine,
        connectedAt: Date.now(),
      };
    }

    const id =
      typeof connectionOrId === "string"
        ? connectionOrId
        : (connectionOrId.id ?? (await this.saveConnection(connectionOrId)).id);
    return invokeNative("connect_connection", { id });
  },

  async disconnect(connectionId: string) {
    if (!isTauriDesktop()) return;
    await invokeNative("disconnect_connection", { id: connectionId });
  },

  async databases(connectionId: string): Promise<{ databases: string[] }> {
    if (!isTauriDesktop()) {
      return { databases: mockDatabases.map((entry) => entry.name) };
    }

    return invokeNative("list_databases", { connectionId });
  },

  async tables(
    connectionId: string,
    database: string,
  ): Promise<{ tables: BridgeTableInfo[]; procedures: string[] }> {
    if (!isTauriDesktop()) {
      const entry = mockDatabases.find((item) => item.name === database);
      return {
        tables: entry?.tables.map(({ name, kind, rows }) => ({ name, kind, rows })) ?? [],
        procedures: entry?.procedures ?? [],
      };
    }

    return invokeNative("list_tables", { connectionId, database });
  },

  async columns(
    connectionId: string,
    database: string,
    table: string,
  ): Promise<{ columns: BridgeColumnInfo[] }> {
    if (!isTauriDesktop()) {
      return { columns: mapMockColumns(database, table) };
    }

    return invokeNative("list_columns", { connectionId, database, table });
  },

  async execute(connectionId: string, sql: string, tabId?: string): Promise<BridgeQueryResult> {
    if (!isTauriDesktop()) {
      return mockExecute(sql);
    }

    return invokeNative("execute_query", {
      connectionId,
      sql,
      tabId: tabId ?? null,
    });
  },

  async history(connectionId?: string): Promise<{ history: QueryHistoryEntry[] }> {
    if (!isTauriDesktop()) return { history: [] };
    return invokeNative("list_query_history", { connectionId: connectionId ?? null });
  },

  async exportResult(result: QueryResult, format: "csv" | "json", path?: string | null) {
    if (!isTauriDesktop()) {
      if (format === "json") {
        downloadBrowserFile("results.json", JSON.stringify(result, null, 2), "application/json");
        return;
      }

      const header = result.columns.map((column) => column.name).join(",");
      const body = result.rows
        .map((row) =>
          row
            .map((cell) =>
              cell == null
                ? ""
                : `"${String(typeof cell === "object" ? JSON.stringify(cell) : cell).replace(/"/g, '""')}"`,
            )
            .join(","),
        )
        .join("\n");
      downloadBrowserFile("results.csv", `${header}\n${body}`, "text/csv");
      return;
    }

    await invokeNative("export_query_result", { result, format, path: path ?? null });
  },
};

export function subscribeBridgeEvents(onEvent: (evt: DesktopEvent) => void): () => void {
  if (!isTauriDesktop()) return () => {};

  let disposed = false;
  let unsubscribe: (() => void) | null = null;

  void listen<DesktopEvent>("desktop://event", (event: { payload: DesktopEvent }) => {
    onEvent(event.payload);
  }).then((unlisten: () => void) => {
    if (disposed) {
      unlisten();
      return;
    }

    unsubscribe = unlisten;
  });

  return () => {
    disposed = true;
    unsubscribe?.();
  };
}
