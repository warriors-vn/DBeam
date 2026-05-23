import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bridge } from "./bridge";
import type { Connection } from "@/lib/db/dexie";

export const bridgeKeys = {
  health: ["bridge", "health"] as const,
  databases: (poolId: string) => ["bridge", "databases", poolId] as const,
  tables: (poolId: string, db: string) => ["bridge", "tables", poolId, db] as const,
  columns: (poolId: string, db: string, table: string) =>
    ["bridge", "columns", poolId, db, table] as const,
};

export function useBridgeHealth(enabled = true) {
  return useQuery({
    queryKey: bridgeKeys.health,
    queryFn: () => bridge.health(),
    refetchInterval: 8_000,
    retry: 0,
    enabled,
  });
}

export function useDatabases(poolId: string | null) {
  return useQuery({
    queryKey: bridgeKeys.databases(poolId ?? "none"),
    queryFn: () => bridge.databases(poolId!),
    enabled: !!poolId,
  });
}

export function useTables(poolId: string | null, database: string | null) {
  return useQuery({
    queryKey: bridgeKeys.tables(poolId ?? "none", database ?? "none"),
    queryFn: () => bridge.tables(poolId!, database!),
    enabled: !!poolId && !!database,
  });
}

export function useColumns(poolId: string | null, database: string | null, table: string | null) {
  return useQuery({
    queryKey: bridgeKeys.columns(poolId ?? "none", database ?? "none", table ?? "none"),
    queryFn: () => bridge.columns(poolId!, database!, table!),
    enabled: !!poolId && !!database && !!table,
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (c: Connection) => bridge.testConnection(c),
  });
}

export function useBridgeConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: Connection) => bridge.connect(c),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bridge"] }),
  });
}