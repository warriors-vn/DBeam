import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConnections } from "@/stores/connections";
import { useTabs } from "@/stores/tabs";
import { useUI } from "@/stores/ui";

export function useDesktopBootstrap() {
  const [ready, setReady] = useState(false);
  const didInit = useRef(false);
  const hydrateUI = useUI((state) => state.hydrate);
  const hydrateTabs = useTabs((state) => state.hydrate);
  const newQueryTab = useTabs((state) => state.newQueryTab);
  const tabs = useTabs((state) => state.tabs);
  const hydrateSelection = useConnections((state) => state.hydrateSelection);
  const loadConnections = useConnections((state) => state.load);
  const connect = useConnections((state) => state.connect);
  const activeId = useConnections((state) => state.activeId);
  const activePoolId = useConnections((state) => state.activePoolId);
  const list = useConnections((state) => state.list);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    void (async () => {
      await Promise.all([hydrateUI(), hydrateTabs(), hydrateSelection()]);
      await loadConnections();
      setReady(true);
    })();
  }, [hydrateSelection, hydrateTabs, hydrateUI, loadConnections]);

  useEffect(() => {
    if (!ready || tabs.length > 0) return;

    const params = new URLSearchParams(window.location.search);
    const sql = params.get("sql");
    newQueryTab(sql ?? undefined);

    if (sql) {
      params.delete("sql");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [newQueryTab, ready, tabs.length]);

  useEffect(() => {
    if (!ready || !activeId || activePoolId) return;

    const connection = list.find((entry) => entry.id === activeId);
    if (!connection?.autoReconnect) return;

    void connect(activeId).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Auto reconnect failed");
    });
  }, [activeId, activePoolId, connect, list, ready]);

  return ready;
}
