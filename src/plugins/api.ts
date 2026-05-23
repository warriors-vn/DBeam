import type { PluginManifest } from "@/types/desktop";

export interface WorkspacePluginRuntime {
  manifest: PluginManifest;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
}

export function createPluginRuntime(manifest: PluginManifest): WorkspacePluginRuntime {
  return {
    manifest,
    async activate() {
      // Reserved for future sandboxed extension host integration.
    },
    async deactivate() {
      // Reserved for future sandboxed extension host integration.
    },
  };
}
