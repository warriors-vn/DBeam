import { useEffect } from "react";
import { Cable, Loader2 } from "lucide-react";
import { useRuntimeHealth } from "@/services/queries";
import { useUI } from "@/stores/ui";
import { subscribeBridgeEvents } from "@/services/bridge";
import { toast } from "sonner";
import { useConnections } from "@/stores/connections";

export function BridgeStatus() {
  const setSettings = useUI((s) => s.setSettings);
  const activePoolId = useConnections((s) => s.activePoolId);
  const { data, isFetching, isError } = useRuntimeHealth(true);

  useEffect(() => {
    const off = subscribeBridgeEvents((evt) => {
      if (evt.type === "query.failed") {
        const p = evt.payload as { message?: string };
        if (p?.message) toast.error(p.message);
      } else if (evt.type === "connection.opened") {
        const p = evt.payload as { name?: string };
        if (p?.name) toast.success(`Connected to ${p.name}`);
      }
    });
    return off;
  }, []);

  const status = isError ? "offline" : data ? "online" : "checking";

  const dot =
    status === "online" ? "bg-emerald-400" : status === "offline" ? "bg-rose-400" : "bg-amber-300";

  const label =
    status === "online"
      ? activePoolId
        ? "Native · connected"
        : "Native · ready"
      : status === "offline"
        ? "Runtime offline"
        : "Starting…";

  return (
    <button
      onClick={() => setSettings(true)}
      title={
        status === "offline"
          ? "The native desktop runtime is not reachable."
          : status === "online"
            ? `${data?.name} v${data?.version} · uptime ${data?.uptimeSec}s`
            : "Loading desktop runtime"
      }
      className="glass-soft flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
    >
      {isFetching && status !== "online" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <span className={`size-1.5 rounded-full ${dot}`} />
      )}
      <Cable className="size-3" />
      <span>{label}</span>
    </button>
  );
}
