import { useTabs } from "@/stores/tabs";
import { X, Plus, FileText, Table2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function TabBar() {
  const { tabs, activeId, setActive, close, newQueryTab } = useTabs();
  return (
    <div className="glass scrollbar-thin flex h-10 shrink-0 items-center gap-1 overflow-x-auto px-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          className={cn(
            "group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
            t.id === activeId
              ? "glass-soft text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {t.kind === "query" ? (
            <FileText className="size-3.5" />
          ) : (
            <Table2 className="size-3.5 text-primary/80" />
          )}
          <span className="max-w-[140px] truncate">{t.title}</span>
          {t.dirty && <Circle className="size-1.5 fill-primary text-primary" />}
          <span
            onClick={(e) => {
              e.stopPropagation();
              close(t.id);
            }}
            className="rounded p-0.5 opacity-60 hover:bg-accent hover:opacity-100"
            role="button"
            aria-label="Close tab"
          >
            <X className="size-3" />
          </span>
        </button>
      ))}
      <button
        onClick={() => newQueryTab()}
        className="ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="New tab"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
