import { useMemo, useState } from "react";
import {
  ChevronRight,
  Database,
  Table2,
  Eye,
  FunctionSquare,
  Search,
  Plus,
  Plug,
} from "lucide-react";
import { useUI } from "@/stores/ui";
import { useConnections } from "@/stores/connections";
import { databasesForConnection } from "@/mock/schema";
import { useTabs } from "@/stores/tabs";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { sidebarCollapsed, setConnections } = useUI();
  const { activeId, list } = useConnections();
  const active = list.find((c) => c.id === activeId);
  const dbs = active ? databasesForConnection(active) : [];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({
    [dbs[0]?.name ?? ""]: true,
    [`${dbs[0]?.name ?? ""}::tables`]: true,
  });
  const openTab = useTabs((s) => s.openTable);
  const newQuery = useTabs((s) => s.newQueryTab);

  const filtered = useMemo(() => {
    if (!query.trim()) return dbs;
    const q = query.toLowerCase();
    return dbs
      .map((d) => ({
        ...d,
        tables: d.tables.filter((t) => t.name.toLowerCase().includes(q)),
      }))
      .filter((d) => d.tables.length);
  }, [dbs, query]);

  if (sidebarCollapsed) {
    return (
      <aside className="glass flex w-12 shrink-0 flex-col items-center gap-2 py-3">
        <button
          onClick={() => setConnections(true)}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plug className="size-4" />
        </button>
        <button
          onClick={() => newQuery()}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="glass scrollbar-thin flex w-64 shrink-0 flex-col overflow-hidden">
      <div className="border-b border-border/60 p-3">
        <button
          onClick={() => setConnections(true)}
          className="glass-soft flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent/60"
        >
          <span
            className="size-2 rounded-full"
            style={{ background: active?.color ?? "var(--color-primary)" }}
          />
          <div className="flex-1 truncate">
            <div className="truncate font-medium text-foreground">
              {active?.name ?? "Choose connection"}
            </div>
            {active && (
              <div className="truncate text-[10px] text-muted-foreground">
                {active.username}@{active.host}:{active.port}
              </div>
            )}
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="glass-soft flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground">
          <Search className="size-3.5" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tables"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!active && (
          <div className="px-2 py-8 text-center text-xs text-muted-foreground">
            No connection.
            <button
              onClick={() => setConnections(true)}
              className="mt-2 block w-full rounded-md border border-border/60 px-2 py-1.5 text-foreground hover:bg-accent"
            >
              Create connection
            </button>
          </div>
        )}
        {filtered.map((d) => (
          <div key={d.name} className="mb-1">
            <button
              onClick={() => setOpen((o) => ({ ...o, [d.name]: !o[d.name] }))}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-accent"
            >
              <ChevronRight
                className={cn(
                  "size-3 text-muted-foreground transition-transform",
                  open[d.name] && "rotate-90",
                )}
              />
              <Database className="size-3.5 text-primary/80" />
              <span className="truncate">{d.name}</span>
            </button>
            {open[d.name] && (
              <div className="ml-3 border-l border-border/60 pl-2">
                <Group
                  label="Tables"
                  icon={<Table2 className="size-3.5" />}
                  defaultOpen
                >
                  {d.tables
                    .filter((t) => t.kind === "table")
                    .map((t) => (
                      <Item
                        key={t.name}
                        label={t.name}
                        meta={`${t.rows.toLocaleString()}`}
                        onClick={() => openTab(d.name, t.name)}
                      />
                    ))}
                </Group>
                <Group label="Views" icon={<Eye className="size-3.5" />}>
                  {d.tables
                    .filter((t) => t.kind === "view")
                    .map((t) => (
                      <Item
                        key={t.name}
                        label={t.name}
                        onClick={() => openTab(d.name, t.name)}
                      />
                    ))}
                </Group>
                <Group
                  label="Procedures"
                  icon={<FunctionSquare className="size-3.5" />}
                >
                  {d.procedures.map((p) => (
                    <Item key={p} label={p} />
                  ))}
                </Group>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border/60 p-2">
        <button
          onClick={() => newQuery()}
          className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-3.5" /> New query
          <span className="ml-2 flex items-center gap-1">
            <span className="kbd">⌘</span>
            <span className="kbd">T</span>
          </span>
        </button>
      </div>
    </aside>
  );
}

function Group({
  label,
  icon,
  children,
  defaultOpen,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const arr = Array.isArray(children) ? children : [children];
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
      >
        <ChevronRight
          className={cn("size-2.5 transition-transform", open && "rotate-90")}
        />
        {icon}
        <span>{label}</span>
        <span className="ml-auto text-muted-foreground/70">{arr.length}</span>
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

function Item({
  label,
  meta,
  onClick,
}: {
  label: string;
  meta?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-foreground/90 hover:bg-accent"
    >
      <span className="truncate">{label}</span>
      {meta && (
        <span className="ml-auto text-[10px] text-muted-foreground">{meta}</span>
      )}
    </button>
  );
}
