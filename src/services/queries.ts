import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { bridge } from "./bridge";
import type { ConnectionInput } from "@/types/desktop";
import { useMemo } from "react";

export const bridgeKeys = {
  health: ["desktop", "health"] as const,
  databases: (poolId: string) => ["desktop", "databases", poolId] as const,
  tables: (poolId: string, db: string) => ["desktop", "tables", poolId, db] as const,
  columns: (poolId: string, db: string, table: string) =>
    ["desktop", "columns", poolId, db, table] as const,
};

export function useRuntimeHealth(enabled = true) {
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
    staleTime: 60_000,
  });
}

export function useColumns(poolId: string | null, database: string | null, table: string | null) {
  return useQuery({
    queryKey: bridgeKeys.columns(poolId ?? "none", database ?? "none", table ?? "none"),
    queryFn: () => bridge.columns(poolId!, database!, table!),
    enabled: !!poolId && !!database && !!table,
    staleTime: 60_000,
  });
}

export function useExplorerCatalog(poolId: string | null) {
  const databasesQuery = useDatabases(poolId);
  const databaseNames = useMemo(
    () => databasesQuery.data?.databases ?? [],
    [databasesQuery.data?.databases],
  );
  const tableQueries = useQueries({
    queries: databaseNames.map((database) => ({
      queryKey: bridgeKeys.tables(poolId ?? "none", database),
      queryFn: () => bridge.tables(poolId!, database),
      enabled: !!poolId,
      staleTime: 60_000,
    })),
  });

  const databases = useMemo(
    () =>
      databaseNames.map((name, index) => ({
        name,
        tables: tableQueries[index]?.data?.tables ?? [],
        procedures: tableQueries[index]?.data?.procedures ?? [],
      })),
    [databaseNames, tableQueries],
  );

  return {
    databases,
    isLoading:
      databasesQuery.isLoading || tableQueries.some((query) => query.isLoading && !query.data),
    isFetching: databasesQuery.isFetching || tableQueries.some((query) => query.isFetching),
  };
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (c: ConnectionInput) => bridge.testConnection(c),
  });
}

export function useBridgeConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bridge.connect(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["desktop"] }),
  });
}
