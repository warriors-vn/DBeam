import { Command } from "cmdk";
import { useEffect } from "react";
import { useUI } from "@/stores/ui";
import { useConnections } from "@/stores/connections";
import { databasesForConnection } from "@/mock/schema";
import { useTabs } from "@/stores/tabs";
import { Database, FileText, Plug, Settings, Table2 } from "lucide-react";

export function CommandPalette() {
  const { paletteOpen, setPalette, setConnections, setSettings } = useUI();
  const { activeId, list, connect } = useConnections();
  const conn = list.find((c) => c.id === activeId);
  const dbs = conn ? databasesForConnection(conn) : [];
  const tabs = useTabs((s) => s.tabs);
  const setActive = useTabs((s) => s.setActive);
  const newQuery = useTabs((s) => s.newQueryTab);
  const openTable = useTabs((s) => s.openTable);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPalette(false);
    };
    if (paletteOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPalette]);

  if (!paletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-sm"
      onClick={() => setPalette(false)}
    >
      <div
        className="glass w-[560px] overflow-hidden rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Palette" className="text-sm">
          <Command.Input
            autoFocus
            placeholder="Type a command, table, or query…"
            className="w-full border-b border-border/60 bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="scrollbar-thin max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
              No results.
            </Command.Empty>

            <Command.Group heading="Actions" className="palette-group">
              <PItem
                icon={<FileText className="size-3.5" />}
                label="New query tab"
                shortcut={["⌘", "T"]}
                onSelect={() => {
                  newQuery();
                  setPalette(false);
                }}
              />
              <PItem
                icon={<Plug className="size-3.5" />}
                label="Manage connections"
                onSelect={() => {
                  setConnections(true);
                  setPalette(false);
                }}
              />
              <PItem
                icon={<Settings className="size-3.5" />}
                label="Open settings"
                onSelect={() => {
                  setSettings(true);
                  setPalette(false);
                }}
              />
            </Command.Group>

            {list.length > 0 && (
              <Command.Group heading="Connections" className="palette-group">
                {list.map((c) => (
                  <PItem
                    key={c.id}
                    icon={<Plug className="size-3.5" />}
                    label={`Connect to ${c.name}`}
                    meta={`${c.host}:${c.port}`}
                    onSelect={() => {
                      void connect(c.id);
                      setPalette(false);
                    }}
                  />
                ))}
              </Command.Group>
            )}

            {dbs.map((d) => (
              <Command.Group key={d.name} heading={d.name} className="palette-group">
                {d.tables.map((t) => (
                  <PItem
                    key={t.name}
                    icon={
                      t.kind === "view" ? (
                        <Database className="size-3.5" />
                      ) : (
                        <Table2 className="size-3.5" />
                      )
                    }
                    label={t.name}
                    meta={`${t.rows.toLocaleString()} rows`}
                    onSelect={() => {
                      openTable(d.name, t.name);
                      setPalette(false);
                    }}
                  />
                ))}
              </Command.Group>
            ))}

            {tabs.length > 0 && (
              <Command.Group heading="Open tabs" className="palette-group">
                {tabs.map((t) => (
                  <PItem
                    key={t.id}
                    icon={<FileText className="size-3.5" />}
                    label={t.title}
                    onSelect={() => {
                      setActive(t.id);
                      setPalette(false);
                    }}
                  />
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function PItem({
  icon,
  label,
  meta,
  shortcut,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  meta?: string;
  shortcut?: string[];
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground/90 aria-selected:bg-accent aria-selected:text-foreground"
    >
      <span className="text-muted-foreground group-aria-selected:text-foreground">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {meta && <span className="text-[10px] text-muted-foreground">{meta}</span>}
      {shortcut && (
        <span className="flex items-center gap-1">
          {shortcut.map((k) => (
            <span key={k} className="kbd">
              {k}
            </span>
          ))}
        </span>
      )}
    </Command.Item>
  );
}
