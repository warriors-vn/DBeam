import { create } from "zustand";
import { streamAiReply } from "@/ai/orchestrator";
import { uid } from "@/lib/id";
import { loadPersistedValue, savePersistedValue } from "@/services/persistence";
import {
  createDefaultNotebook,
  createDefaultWorkspace,
  createDefaultWorkspaceState,
} from "@/workspace/defaults";
import type {
  AiContextSnapshot,
  AiMessage,
  AiThread,
  MigrationDraft,
  NotebookBlock,
  NotebookDocument,
  PluginManifest,
  QueryTelemetryEntry,
  TelemetrySnapshot,
  WorkspaceActivity,
  WorkspaceLayoutState,
  WorkspacePanel,
  WorkspacePersistedState,
  WorkspaceSnippet,
  WorkspaceSummary,
} from "@/types/desktop";

const WORKSPACE_KEY = "phase4.workspace";

interface WorkspaceStore extends WorkspacePersistedState {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  activeWorkspace: () => WorkspaceSummary | null;
  activeNotebook: () => NotebookDocument | null;
  activeThread: (tabId?: string | null) => AiThread | null;
  openPanel: (panel: WorkspacePanel) => void;
  togglePanel: (panel?: WorkspacePanel) => void;
  setDockWidth: (width: number) => void;
  createWorkspace: (name?: string) => void;
  switchWorkspace: (id: string) => void;
  addActivity: (activity: Omit<WorkspaceActivity, "id" | "workspaceId" | "ts">) => void;
  createNotebook: (title?: string) => NotebookDocument;
  appendNotebookBlock: (
    block: Omit<NotebookBlock, "id" | "createdAt">,
    notebookId?: string,
  ) => void;
  updateNotebookBlock: (notebookId: string, blockId: string, patch: Partial<NotebookBlock>) => void;
  addSnippet: (
    snippet: Omit<WorkspaceSnippet, "id" | "workspaceId" | "createdAt" | "updatedAt">,
  ) => void;
  addMigrationDraft: (
    draft: Omit<MigrationDraft, "id" | "workspaceId" | "createdAt" | "updatedAt">,
  ) => void;
  recordQueryMetric: (entry: Omit<QueryTelemetryEntry, "id" | "workspaceId" | "ts">) => void;
  telemetrySnapshot: () => TelemetrySnapshot;
  sendAiPrompt: (
    prompt: string,
    context: AiContextSnapshot,
    tabId?: string | null,
    connectionId?: string | null,
  ) => Promise<void>;
  togglePlugin: (id: string) => void;
}

function persistable(state: WorkspaceStore): WorkspacePersistedState {
  return {
    workspaces: state.workspaces,
    activeWorkspaceId: state.activeWorkspaceId,
    layout: state.layout,
    threads: state.threads,
    notebooks: state.notebooks,
    snippets: state.snippets,
    migrations: state.migrations,
    activities: state.activities,
    telemetry: state.telemetry,
    plugins: state.plugins,
  };
}

function now() {
  return Date.now();
}

export const useWorkspace = create<WorkspaceStore>((set, get) => ({
  ...createDefaultWorkspaceState(),
  hydrated: false,
  async hydrate() {
    const state = await loadPersistedValue(WORKSPACE_KEY, createDefaultWorkspaceState());
    set({ ...state, hydrated: true });
  },
  async persist() {
    await savePersistedValue(WORKSPACE_KEY, persistable(get()));
  },
  activeWorkspace() {
    return get().workspaces.find((workspace) => workspace.id === get().activeWorkspaceId) ?? null;
  },
  activeNotebook() {
    const workspace = get().activeWorkspace();
    if (!workspace) return null;
    return get().notebooks.find((notebook) => notebook.workspaceId === workspace.id) ?? null;
  },
  activeThread(tabId) {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) return null;
    return (
      get()
        .threads.filter((thread) => thread.workspaceId === workspaceId)
        .find((thread) => (tabId ? thread.tabId === tabId : true)) ?? null
    );
  },
  openPanel(panel) {
    set((state) => ({ layout: { ...state.layout, panelOpen: true, activePanel: panel } }));
    void get().persist();
  },
  togglePanel(panel) {
    set((state) => ({
      layout: {
        ...state.layout,
        panelOpen: panel ? true : !state.layout.panelOpen,
        activePanel: panel ?? state.layout.activePanel,
      },
    }));
    void get().persist();
  },
  setDockWidth(width) {
    set((state) => ({
      layout: {
        ...state.layout,
        dockWidth: Math.min(620, Math.max(320, width)),
      },
    }));
    void get().persist();
  },
  createWorkspace(name) {
    const workspace = createDefaultWorkspace(name ?? `Workspace ${get().workspaces.length + 1}`);
    const notebook = createDefaultNotebook(workspace.id);
    set((state) => ({
      workspaces: [workspace, ...state.workspaces],
      activeWorkspaceId: workspace.id,
      notebooks: [notebook, ...state.notebooks],
      activities: [
        {
          id: uid(),
          workspaceId: workspace.id,
          kind: "workspace",
          title: `Created ${workspace.name}`,
          detail: "Provisioned a new local-first workspace.",
          ts: now(),
        },
        ...state.activities,
      ],
    }));
    void get().persist();
  },
  switchWorkspace(id) {
    set((state) => ({
      activeWorkspaceId: id,
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === id ? { ...workspace, lastOpenedAt: now(), updatedAt: now() } : workspace,
      ),
    }));
    void get().persist();
  },
  addActivity(activity) {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) return;
    set((state) => ({
      activities: [
        {
          id: uid(),
          workspaceId,
          ts: now(),
          ...activity,
        },
        ...state.activities,
      ].slice(0, 120),
    }));
    void get().persist();
  },
  createNotebook(title) {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      const fallback = createDefaultNotebook(createDefaultWorkspaceState().activeWorkspaceId!);
      return fallback;
    }
    const notebook: NotebookDocument = {
      id: uid(),
      workspaceId,
      title:
        title ??
        `Notebook ${get().notebooks.filter((item) => item.workspaceId === workspaceId).length + 1}`,
      blocks: [],
      createdAt: now(),
      updatedAt: now(),
    };
    set((state) => ({ notebooks: [notebook, ...state.notebooks] }));
    get().addActivity({ kind: "notebook", title: `Created ${notebook.title}` });
    void get().persist();
    return notebook;
  },
  appendNotebookBlock(block, notebookId) {
    const notebook = notebookId
      ? get().notebooks.find((item) => item.id === notebookId)
      : get().activeNotebook();
    if (!notebook) return;
    const nextBlock: NotebookBlock = {
      id: uid(),
      createdAt: now(),
      ...block,
    };
    set((state) => ({
      notebooks: state.notebooks.map((item) =>
        item.id === notebook.id
          ? { ...item, blocks: [...item.blocks, nextBlock], updatedAt: now() }
          : item,
      ),
    }));
    void get().persist();
  },
  updateNotebookBlock(notebookId, blockId, patch) {
    set((state) => ({
      notebooks: state.notebooks.map((item) =>
        item.id === notebookId
          ? {
              ...item,
              updatedAt: now(),
              blocks: item.blocks.map((block) =>
                block.id === blockId ? { ...block, ...patch } : block,
              ),
            }
          : item,
      ),
    }));
    void get().persist();
  },
  addSnippet(snippet) {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) return;
    set((state) => ({
      snippets: [
        {
          id: uid(),
          workspaceId,
          createdAt: now(),
          updatedAt: now(),
          ...snippet,
        },
        ...state.snippets,
      ],
    }));
    get().addActivity({ kind: "snippet", title: `Saved snippet · ${snippet.title}` });
    void get().persist();
  },
  addMigrationDraft(draft) {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) return;
    set((state) => ({
      migrations: [
        {
          id: uid(),
          workspaceId,
          createdAt: now(),
          updatedAt: now(),
          ...draft,
        },
        ...state.migrations,
      ],
    }));
    get().addActivity({ kind: "migration", title: `Drafted migration · ${draft.title}` });
    void get().persist();
  },
  recordQueryMetric(entry) {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) return;
    set((state) => ({
      telemetry: [
        {
          id: uid(),
          workspaceId,
          ts: now(),
          ...entry,
        },
        ...state.telemetry,
      ].slice(0, 300),
    }));
    void get().persist();
  },
  telemetrySnapshot() {
    const workspaceId = get().activeWorkspaceId;
    const entries = get().telemetry.filter((entry) => entry.workspaceId === workspaceId);
    const totalQueries = entries.length;
    const totalDuration = entries.reduce((sum, entry) => sum + entry.durationMs, 0);
    const totalRowsObserved = entries.reduce((sum, entry) => sum + entry.rowCount, 0);
    return {
      totalQueries,
      slowQueries: entries.filter((entry) => entry.durationMs >= 1200).length,
      avgDurationMs: totalQueries ? Math.round(totalDuration / totalQueries) : 0,
      totalRowsObserved,
    };
  },
  async sendAiPrompt(prompt, context, tabId, connectionId) {
    const workspaceId = get().activeWorkspaceId;
    const workspace = get().activeWorkspace();
    if (!workspaceId || !workspace) return;

    const existingThread = get().activeThread(tabId);
    const threadId = existingThread?.id ?? uid();
    const userMessage: AiMessage = {
      id: uid(),
      role: "user",
      content: prompt,
      createdAt: now(),
      status: "ready",
    };
    const assistantId = uid();
    const assistantMessage: AiMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: now(),
      status: "streaming",
    };

    set((state) => {
      const existing = state.threads.find((thread) => thread.id === threadId);
      const thread: AiThread = existing
        ? {
            ...existing,
            title: existing.title || prompt.slice(0, 48),
            updatedAt: now(),
            messages: [...existing.messages, userMessage, assistantMessage],
          }
        : {
            id: threadId,
            workspaceId,
            title: prompt.slice(0, 48),
            providerId: "mock-openai",
            connectionId: connectionId ?? null,
            tabId: tabId ?? null,
            createdAt: now(),
            updatedAt: now(),
            messages: [userMessage, assistantMessage],
          };

      return {
        threads: existing
          ? state.threads.map((item) => (item.id === threadId ? thread : item))
          : [thread, ...state.threads],
        layout: {
          ...state.layout,
          panelOpen: true,
          activePanel: "ai",
        },
      };
    });

    for await (const chunk of streamAiReply("mock-openai", {
      prompt,
      context: { ...context, workspaceName: workspace.name },
    })) {
      if (chunk.type === "delta" && chunk.content) {
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  updatedAt: now(),
                  messages: thread.messages.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          content: `${message.content}${chunk.content}`,
                        }
                      : message,
                  ),
                }
              : thread,
          ),
        }));
      } else if (chunk.type === "actions" && chunk.actions) {
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  updatedAt: now(),
                  messages: thread.messages.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          actions: chunk.actions,
                        }
                      : message,
                  ),
                }
              : thread,
          ),
        }));
      } else if (chunk.type === "done") {
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  updatedAt: now(),
                  messages: thread.messages.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          status: "ready",
                        }
                      : message,
                  ),
                }
              : thread,
          ),
        }));
      }
    }

    get().addActivity({
      kind: "ai",
      title: `AI copilot · ${prompt.slice(0, 48)}`,
      detail: context.connectionName,
      tabId: tabId ?? null,
      connectionId: connectionId ?? null,
    });
    void get().persist();
  },
  togglePlugin(id) {
    set((state) => ({
      plugins: state.plugins.map((plugin) =>
        plugin.id === id ? { ...plugin, enabled: !plugin.enabled } : plugin,
      ),
    }));
    void get().persist();
  },
}));
