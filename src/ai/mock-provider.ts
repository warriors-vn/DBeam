import type { AiAction, AiContextSnapshot } from "@/types/desktop";
import type { AiPromptRequest, AiProvider, AiStreamChunk } from "./providers";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSqlSuggestion(prompt: string, context: AiContextSnapshot) {
  if (/customers|revenue|top/i.test(prompt)) {
    return [
      "SELECT",
      "  customer_id,",
      "  SUM(total_cents) / 100.0 AS revenue_usd",
      "FROM orders",
      "WHERE created_at >= NOW() - INTERVAL 30 DAY",
      "GROUP BY customer_id",
      "ORDER BY revenue_usd DESC",
      "LIMIT 10;",
    ].join("\n");
  }

  if (/index|optimi[sz]e|slow/i.test(prompt)) {
    return [
      "-- Suggested optimization",
      "CREATE INDEX idx_orders_customer_created_at",
      "ON orders (customer_id, created_at DESC);",
    ].join("\n");
  }

  if (/migration|schema/i.test(prompt)) {
    return [
      "ALTER TABLE users",
      "  ADD COLUMN last_seen_at TIMESTAMP NULL,",
      "  ADD INDEX idx_users_last_seen_at (last_seen_at);",
    ].join("\n");
  }

  return context.sql?.trim()
    ? context.sql
    : ["SELECT *", "FROM users", "ORDER BY created_at DESC", "LIMIT 100;"].join("\n");
}

function buildNarrative(request: AiPromptRequest, sqlSuggestion: string) {
  const schema = request.context.schemaSummary?.slice(0, 5).join(", ") ?? "No schema cached yet";
  const resultSummary = request.context.resultPreview ?? "No results loaded yet.";

  return [
    `You asked: ${request.prompt}`,
    "",
    "Recommended approach:",
    "- stay scoped to the active workspace and connection",
    "- prefer safe reads first, then promote the query to a snippet or migration draft",
    `- use the current schema context: ${schema}`,
    "",
    "SQL draft:",
    sqlSuggestion,
    "",
    "Why this works:",
    "- it is shaped around the current editor/database context",
    "- it is prepared for notebook documentation and snippet reuse",
    `- current result context: ${resultSummary}`,
  ].join("\n");
}

function buildActions(prompt: string, sqlSuggestion: string): AiAction[] {
  const base: AiAction[] = [
    {
      id: crypto.randomUUID(),
      kind: "insert-sql",
      label: "Insert into editor",
      payload: sqlSuggestion,
      description: "Replace or append SQL in the active query tab",
    },
    {
      id: crypto.randomUUID(),
      kind: "create-snippet",
      label: "Save as snippet",
      payload: sqlSuggestion,
      description: "Turn this into a reusable SQL snippet",
    },
    {
      id: crypto.randomUUID(),
      kind: "append-note",
      label: "Add to notebook",
      payload: `### AI analysis\n\n${sqlSuggestion}`,
      description: "Capture this recommendation inside the active notebook",
    },
  ];

  if (/migration|schema|index|optimi[sz]e/i.test(prompt)) {
    base.push({
      id: crypto.randomUUID(),
      kind: "create-migration",
      label: "Create migration draft",
      payload: sqlSuggestion,
      description: "Promote this AI output into a draft migration",
    });
  }

  return base;
}

async function* streamNarrative(
  narrative: string,
  actions: AiAction[],
): AsyncGenerator<AiStreamChunk> {
  const chunks = narrative.split(/(\s+)/).filter(Boolean);
  for (const chunk of chunks) {
    await sleep(16);
    yield { type: "delta", content: chunk };
  }
  yield { type: "actions", actions };
  yield { type: "done" };
}

export const mockAiProvider: AiProvider = {
  id: "mock-openai",
  label: "Mock OpenAI",
  async *stream(request) {
    const sqlSuggestion = buildSqlSuggestion(request.prompt, request.context);
    const narrative = buildNarrative(request, sqlSuggestion);
    const actions = buildActions(request.prompt, sqlSuggestion);
    yield* streamNarrative(narrative, actions);
  },
};
