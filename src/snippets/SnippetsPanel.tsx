import { useMemo, useState } from "react";
import { Braces, CopyPlus, Search, Star } from "lucide-react";
import { useWorkspace } from "@/stores/workspace";
import { useTabs } from "@/stores/tabs";

export function SnippetsPanel() {
  const [query, setQuery] = useState("");
  const snippets = useWorkspace((state) => state.snippets);
  const addSnippet = useWorkspace((state) => state.addSnippet);
  const activeWorkspaceId = useWorkspace((state) => state.activeWorkspaceId);
  const activeId = useTabs((state) => state.activeId);
  const tabs = useTabs((state) => state.tabs);
  const updateTab = useTabs((state) => state.update);
  const activeTab =
    tabs.find(
      (tab): tab is Extract<(typeof tabs)[number], { kind: "query" }> =>
        tab.id === activeId && tab.kind === "query",
    ) ?? null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return snippets
      .filter((snippet) => snippet.workspaceId === activeWorkspaceId)
      .filter((snippet) => {
        if (!normalized) return true;
        return [snippet.title, snippet.description, snippet.folder, snippet.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      });
  }, [activeWorkspaceId, query, snippets]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Braces className="size-4 text-primary" /> Snippets
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Reusable SQL building blocks with folders, tags, and AI-generated workflows.
        </p>
      </div>

      <div className="border-b border-border/60 px-4 py-3">
        <div className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground">
          <Search className="size-3.5" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search snippets"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={() =>
            activeTab &&
            addSnippet({
              title: `${activeTab.title} snippet`,
              description: "Captured from the active query tab.",
              sql: activeTab.sql,
              folder: "Captured",
              tags: ["captured"],
              variables: [],
              favorite: false,
            })
          }
          className="mt-3 w-full rounded-xl border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <CopyPlus className="mr-1 inline size-3.5" /> Save current query as snippet
        </button>
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {filtered.map((snippet) => (
          <div key={snippet.id} className="glass-soft rounded-2xl border border-border/60 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {snippet.favorite ? (
                <Star className="size-3.5 fill-amber-300 text-amber-300" />
              ) : null}
              {snippet.title}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {snippet.folder} · {snippet.tags.join(", ")}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{snippet.description}</p>
            <pre className="mono mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-[11px] text-foreground/90">
              {snippet.sql}
            </pre>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {snippet.variables.length
                  ? `Variables: ${snippet.variables.join(", ")}`
                  : "No variables"}
              </span>
              <button
                onClick={() =>
                  activeTab && updateTab(activeTab.id, { sql: snippet.sql, dirty: true })
                }
                className="rounded-full border border-border/60 px-2.5 py-1 hover:bg-accent hover:text-foreground"
              >
                Insert
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
