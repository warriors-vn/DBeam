import { type ReactNode } from "react";
import { Activity, BarChart3, Clock3, DatabaseZap } from "lucide-react";
import { useWorkspace } from "@/stores/workspace";

export function TelemetryPanel() {
  const telemetry = useWorkspace((state) => state.telemetry);
  const activeWorkspaceId = useWorkspace((state) => state.activeWorkspaceId);
  const snapshot = useWorkspace((state) => state.telemetrySnapshot());
  const plugins = useWorkspace((state) => state.plugins);

  const entries = telemetry.filter((entry) => entry.workspaceId === activeWorkspaceId);
  const slow = entries.filter((entry) => entry.durationMs >= 1200).slice(0, 8);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Activity className="size-4 text-primary" /> Observability
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Track slow queries, execution metrics, active workspace activity, and plugin readiness.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-border/60 px-4 py-4 text-xs">
        <MetricCard
          icon={<BarChart3 className="size-3.5" />}
          label="Total queries"
          value={snapshot.totalQueries.toLocaleString()}
        />
        <MetricCard
          icon={<Clock3 className="size-3.5" />}
          label="Avg duration"
          value={`${snapshot.avgDurationMs} ms`}
        />
        <MetricCard
          icon={<DatabaseZap className="size-3.5" />}
          label="Slow queries"
          value={snapshot.slowQueries.toLocaleString()}
        />
        <MetricCard
          icon={<Activity className="size-3.5" />}
          label="Rows observed"
          value={snapshot.totalRowsObserved.toLocaleString()}
        />
      </div>

      <div className="border-b border-border/60 px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Slow query timeline
        </div>
      </div>
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {slow.length ? (
          slow.map((entry) => (
            <div
              key={entry.id}
              className="glass-soft rounded-2xl border border-border/60 p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-3 text-foreground">
                <span className="mono truncate">{entry.sql.slice(0, 72)}</span>
                <span className="rounded-full border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">
                  {entry.durationMs}ms
                </span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {entry.rowCount.toLocaleString()} rows · {new Date(entry.ts).toLocaleTimeString()}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-soft rounded-2xl p-4 text-xs text-muted-foreground">
            No slow queries yet. Run queries or open tables to populate telemetry.
          </div>
        )}

        <div className="rounded-2xl border border-border/60 p-3 text-xs">
          <div className="mb-2 font-medium text-foreground">Plugin architecture readiness</div>
          <div className="space-y-2 text-muted-foreground">
            {plugins.map((plugin) => (
              <div key={plugin.id} className="flex items-center justify-between gap-3">
                <span>{plugin.name}</span>
                <span className="rounded-full border border-border/60 px-2 py-1 text-[10px] uppercase tracking-wider">
                  {plugin.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="glass-soft rounded-2xl border border-border/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
