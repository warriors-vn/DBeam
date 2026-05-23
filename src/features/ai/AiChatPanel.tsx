import { useMemo, useState } from "react";
import { Bot, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useWorkspace } from "@/stores/workspace";
import { useTabs } from "@/stores/tabs";
import { useConnections } from "@/stores/connections";
import { useExplorerCatalog } from "@/services/queries";
import type { AiAction } from "@/types/desktop";

const QUICK_PROMPTS = [
  "Generate SQL for top customers in the last 30 days",
  "Explain this query and highlight risk",
  "Optimize this query and suggest indexes",
  "Turn the current SQL into a migration draft",
];

export function AiChatPanel() {
  const [prompt, setPrompt] = useState("");
  const activeId = useTabs((state) => state.activeId);
  const tabs = useTabs((state) => state.tabs);
  const updateTab = useTabs((state) => state.update);
  const activeTab =
    tabs.find(
      (tab): tab is Extract<(typeof tabs)[number], { kind: "query" }> =>
        tab.id === activeId && tab.kind === "query",
    ) ?? null;
  const activeConnId = useConnections((state) => state.activeId);
  const activePoolId = useConnections((state) => state.activePoolId);
  const connections = useConnections((state) => state.list);
  const connection = connections.find((entry) => entry.id === activeConnId) ?? null;
  const { databases } = useExplorerCatalog(activePoolId);
  const activeThread = useWorkspace((state) => state.activeThread(activeId));
  const sendAiPrompt = useWorkspace((state) => state.sendAiPrompt);
  const addSnippet = useWorkspace((state) => state.addSnippet);
  const appendNotebookBlock = useWorkspace((state) => state.appendNotebookBlock);
  const addMigrationDraft = useWorkspace((state) => state.addMigrationDraft);

  const schemaSummary = useMemo(
    () =>
      databases.flatMap((database) =>
        database.tables.slice(0, 4).map((table) => `${database.name}.${table.name}`),
      ),
    [databases],
  );

  const isStreaming = activeThread?.messages.some((message) => message.status === "streaming");

  async function submit(nextPrompt: string) {
    const trimmed = nextPrompt.trim();
    if (!trimmed) return;

    await sendAiPrompt(
      trimmed,
      {
        workspaceName: "",
        connectionName: connection?.name,
        tabTitle: activeTab?.title,
        sql: activeTab?.sql,
        schemaSummary,
        resultPreview: activeTab?.result
          ? `${activeTab.result.rowCount} rows in ${activeTab.result.durationMs}ms`
          : undefined,
      },
      activeTab?.id ?? null,
      connection?.id ?? null,
    );
    setPrompt("");
  }

  function handleAction(action: AiAction) {
    if (action.kind === "insert-sql" && activeTab) {
      updateTab(activeTab.id, { sql: action.payload, dirty: true });
      return;
    }

    if (action.kind === "create-snippet") {
      addSnippet({
        title: activeTab ? `${activeTab.title} · AI` : "AI snippet",
        description: "Saved from AI copilot output",
        sql: action.payload,
        folder: "AI",
        tags: ["ai", "generated"],
        variables: [],
        favorite: false,
      });
      return;
    }

    if (action.kind === "append-note") {
      appendNotebookBlock({
        type: "markdown",
        content: action.payload,
      });
      return;
    }

    if (action.kind === "create-migration") {
      addMigrationDraft({
        title: activeTab ? `${activeTab.title} · AI migration` : "AI migration",
        rationale: "Generated from AI copilot action.",
        upSql: action.payload,
        downSql: "-- TODO: define rollback",
        status: "draft",
      });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Bot className="size-4 text-primary" /> AI SQL Copilot
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Schema-aware assistant for SQL generation, optimization, migrations, and documentation.
        </p>
      </div>

      <div className="border-b border-border/60 px-4 py-3">
        <div className="mb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Quick prompts
        </div>
        <div className="grid gap-2">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item}
              onClick={() => void submit(item)}
              className="glass-soft rounded-lg px-3 py-2 text-left text-xs text-muted-foreground transition hover:text-foreground"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {activeThread?.messages.length ? (
          activeThread.messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl border px-3 py-2 text-xs ${
                message.role === "assistant"
                  ? "glass-soft border-border/60 text-foreground"
                  : "border-primary/25 bg-primary/10 text-primary-foreground/90"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {message.role === "assistant" ? (
                  <Sparkles className="size-3" />
                ) : (
                  <Wand2 className="size-3" />
                )}
                {message.role}
                {message.status === "streaming" && <Loader2 className="size-3 animate-spin" />}
              </div>
              <pre className="whitespace-pre-wrap font-sans leading-5">{message.content}</pre>
              {message.actions?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action)}
                      className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="glass-soft rounded-2xl p-4 text-xs text-muted-foreground">
            Ask for SQL generation, query explanations, schema summaries, or migration drafts.
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-4">
        <div className="glass-soft rounded-2xl border border-border/60 p-2">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask AI to generate SQL, explain a query, suggest indexes, or create a migration..."
            className="h-24 w-full resize-none bg-transparent px-2 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between px-2 pb-1 pt-2 text-[11px] text-muted-foreground">
            <span>
              {connection ? `Context: ${connection.name}` : "No active connection context"}
            </span>
            <button
              onClick={() => void submit(prompt)}
              disabled={isStreaming}
              className="rounded-full bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
            >
              {isStreaming ? "Streaming…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
