import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConnections } from "@/stores/connections";
import type { Connection } from "@/lib/db/dexie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUI } from "@/stores/ui";
import { Plus, Plug, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const empty = {
  name: "Local MySQL",
  host: "127.0.0.1",
  port: 3306,
  username: "root",
  password: "",
  database: "",
  ssl: false,
  color: "#6aa6ff",
};

export function ConnectionsDialog() {
  const { connectionsOpen, setConnections } = useUI();
  const { list, load, upsert, remove, connect, activeId } = useConnections();
  const [editing, setEditing] = useState<(typeof empty) & { id?: string }>(empty);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (connectionsOpen) void load();
  }, [connectionsOpen, load]);

  function pick(c: Connection) {
    setEditing({ ...c, color: c.color ?? "#6aa6ff" });
  }

  async function save() {
    if (!editing.name.trim()) return toast.error("Name required");
    const saved = await upsert(editing);
    toast.success(`Saved ${saved.name}`);
    setEditing({ ...saved, color: saved.color ?? "#6aa6ff" });
  }

  async function test() {
    setTesting(true);
    await new Promise((r) => setTimeout(r, 700));
    setTesting(false);
    toast.success("Connection OK (mocked)");
  }

  async function connectNow() {
    const saved = await upsert(editing);
    await connect(saved.id);
    setConnections(false);
    toast.success(`Connected to ${saved.name}`);
  }

  return (
    <Dialog open={connectionsOpen} onOpenChange={setConnections}>
      <DialogContent className="glass max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 p-4">
          <DialogTitle className="text-sm font-medium">Connections</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[200px_1fr] min-h-[420px]">
          <div className="scrollbar-thin border-r border-border/60 p-2">
            <button
              onClick={() => setEditing(empty)}
              className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-3.5" /> New connection
            </button>
            {list.length === 0 && (
              <div className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                No saved connections
              </div>
            )}
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => pick(c)}
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
                {activeId === c.id && (
                  <CheckCircle2 className="size-3 text-emerald-400" />
                )}
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
                  onChange={(e) =>
                    setEditing({ ...editing, port: Number(e.target.value) || 3306 })
                  }
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
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <div>
                <div className="text-xs font-medium">SSL</div>
                <div className="text-[11px] text-muted-foreground">
                  Use TLS for this connection
                </div>
              </div>
              <Switch
                checked={editing.ssl}
                onCheckedChange={(v) => setEditing({ ...editing, ssl: v })}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {editing.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editing.id && remove(editing.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={test} disabled={testing}>
                {testing ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Test
              </Button>
              <Button variant="secondary" size="sm" onClick={save}>
                Save
              </Button>
              <Button size="sm" onClick={connectNow}>
                <Plug className="size-3.5" /> Connect
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}
