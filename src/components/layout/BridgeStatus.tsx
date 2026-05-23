import { useEffect } from "react";
import { Cable, Loader2 } from "lucide-react";
import { useBridgeHealth } from "@/services/queries";
import { useUI } from "@/stores/ui";
import { subscribeBridgeEvents } from "@/services/bridge";
import { toast } from "sonner";

export function BridgeStatus() {
  const { useBridge, setSettings } = useUI();
  const { data, isFetching, isError } = useBridgeHealth(useBridge);

  useEffect(() => {
    if (!useBridge) return;
    const off = subscribeBridgeEvents((evt) => {
      if (evt.type === "query.failed") {
        const p = evt.payload as { message?: string };
        if (p?.message) toast.error(p.message);
      }
    });
    return off;
  }, [useBridge]);

  const status = !useBridge ? "off" : isError ? "offline" : data ? "online" : "checking";

  const dot =
    status === "online"
      ? "bg-emerald-400"
      : status === "offline"
        ? "bg-rose-400"
        : status === "checking"
          ? "bg-amber-300"
          : "bg-muted-foreground";

  const label =
    status === "online"
      ? `Bridge ${data?.safeMode ? "· safe" : ""}`
      : status === "offline"
        ? "Bridge offline"
        : status === "checking"
          ? "Checking…"
          : "Bridge off";

  return (
    <button
      onClick={() => setSettings(true)}
      title={
        status === "offline"
          ? "Bridge agent not reachable. Click to configure URL."
          : status === "online"
            ? `Bridge v${data?.version} · uptime ${data?.uptimeSec}s`
            : "Configure bridge"
      }
      className="glass-soft flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
    >
      {isFetching && status === "checking" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <span className={`size-1.5 rounded-full ${dot}`} />
      )}
      <Cable className="size-3" />
      <span>{label}</span>
    </button>
  );
}