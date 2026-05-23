import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConnections } from "@/stores/connections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUI } from "@/stores/ui";
import { CheckCircle2, Loader2, Plus, Plug, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ConnectionDetails, ConnectionInput, ConnectionSummary } from "@/types/desktop";

type Draft = ConnectionInput & { tagsText: string };

const empty: Draft = {
  engine: "mysql",
  name: "Local MySQL",
  host: "127.0.0.1",
  port: 3306,
  username: "root",
  password: "",
  database: "",
  ssl: false,
  color: "#6aa6ff",
  favorite: false,
  autoReconnect: true,
  group: "Local",
  tags: [],
  tagsText: "local, mysql",
};

function fromConnection(connection: ConnectionDetails): Draft {
  return {
    ...connection,
    password: connection.password ?? "",
    group: connection.group ?? "",
    tagsText: connection.tags.join(", "),
  };
}

function toInput(draft: Draft): ConnectionInput {
  return {
    id: draft.id,
    engine: draft.engine,
    name: draft.name.trim(),
    host: draft.host.trim(),
    port: draft.port,
    username: draft.username.trim(),
    password: draft.password,
    database: draft.database.trim(),
    ssl: draft.ssl,
    color: draft.color,
    favorite: draft.favorite,
    autoReconnect: draft.autoReconnect,
    group: draft.group?.trim() || null,
    tags: draft.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

export function ConnectionsDialog() {
  const { connectionsOpen, setConnections } = useUI();
  const {
    list,
    load,
    upsert,
    remove,
    connect,
    getConnection,
    test: testConnection,
    activeId,
  } = useConnections();
  const [editing, setEditing] = useState<Draft>(empty);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (connectionsOpen) void load();
  }, [connectionsOpen, load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((connection) => {
      const haystack = [
        connection.name,
        connection.host,
        connection.database,
        connection.group ?? "",
        connection.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [list, search]);

  async function pick(connection: ConnectionSummary) {
    setLoadingDetails(true);
    try {
      const details = await getConnection(connection.id);
      setEditing(fromConnection(details));
    } finally {
      setLoadingDetails(false);
    }
  }

  async function save() {
    if (!editing.name.trim()) return toast.error("Name required");
    setSaving(true);
    try {
      const saved = await upsert(toInput(editing));
      toast.success(`Saved ${saved.name}`);
      setEditing((draft) => ({ ...draft, id: saved.id }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save connection");
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTesting(true);
    try {
      const res = await testConnection(toInput(editing));
      toast.success(`Connection OK · ${res.latencyMs}ms`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  async function connectNow() {
    try {
      const saved = await upsert(toInput(editing));
      await connect(saved.id);
      setConnections(false);
      toast.success(`Connected to ${saved.name}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={connectionsOpen} onOpenChange={setConnections}>
      <DialogContent className="glass max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 p-4">
          <DialogTitle className="text-sm font-medium">Native Connections</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[200px_1fr] min-h-[420px]">
          <div className="scrollbar-thin border-r border-border/60 p-2">
            <div className="glass-soft mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground">
              <Search className="size-3.5" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search connections"
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={() => setEditing(empty)}
              className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-3.5" /> New connection
            </button>
            {filtered.length === 0 && (
              <div className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                No saved connections
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => void pick(c)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                  editing.id === c.id
                    ? "glass-soft text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: c.color ?? "var(--color-primary)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-foreground">{c.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {c.host}:{c.port}
                  </div>
                </div>
                {c.favorite && <Star className="size-3 fill-amber-300 text-amber-300" />}
                {activeId === c.id && <CheckCircle2 className="size-3 text-emerald-400" />}
              </button>
            ))}
          </div>

          <div className="space-y-3 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="Database">
                <Input
                  value={editing.database}
                  onChange={(e) => setEditing({ ...editing, database: e.target.value })}
                  placeholder="acme_production"
                />
              </Field>
              <Field label="Group">
                <Input
                  value={editing.group ?? ""}
                  onChange={(e) => setEditing({ ...editing, group: e.target.value })}
                  placeholder="Production"
                />
              </Field>
              <Field label="Host">
                <Input
                  value={editing.host}
                  onChange={(e) => setEditing({ ...editing, host: e.target.value })}
                />
              </Field>
              <Field label="Port">
                <Input
                  type="number"
                  value={editing.port}
                  onChange={(e) => setEditing({ ...editing, port: Number(e.target.value) || 3306 })}
                />
              </Field>
              <Field label="Username">
                <Input
                  value={editing.username}
                  onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={editing.password}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                />
              </Field>
              <Field label="Tags">
                <Input
                  value={editing.tagsText}
                  onChange={(e) => setEditing({ ...editing, tagsText: e.target.value })}
                  placeholder="mysql, local, analytics"
                />
              </Field>
              <Field label="Accent color">
                <Input
                  type="color"
                  value={editing.color ?? "#6aa6ff"}
                  onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                  className="h-10"
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ToggleCard
                label="SSL"
                description="Use TLS for this connection"
                checked={editing.ssl}
                onCheckedChange={(value) => setEditing({ ...editing, ssl: value })}
              />
              <ToggleCard
                label="Favorite"
                description="Pin near the top of the list"
                checked={editing.favorite}
                onCheckedChange={(value) => setEditing({ ...editing, favorite: value })}
              />
              <ToggleCard
                label="Auto reconnect"
                description="Restore session on startup"
                checked={editing.autoReconnect}
                onCheckedChange={(value) => setEditing({ ...editing, autoReconnect: value })}
              />
            </div>

            <div className="rounded-md border border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
              <div className="font-medium text-foreground">Storage model</div>
              Passwords are stored in the OS keychain. Connection metadata stays in the local
              desktop store and never leaves the machine.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {editing.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editing.id && void remove(editing.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={runTest} disabled={testing}>
                {testing ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Test
              </Button>
              <Button variant="secondary" size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save
              </Button>
              <Button size="sm" onClick={connectNow} disabled={loadingDetails}>
                <Plug className="size-3.5" /> Connect
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToggleCard({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <div>
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</Label>
      {children}
    </div>
  );
}
