import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriDesktop } from "./bridge";

export async function minimizeWindow() {
  if (!isTauriDesktop()) return;
  await getCurrentWindow().minimize();
}

export async function toggleMaximizeWindow() {
  if (!isTauriDesktop()) return;
  const current = getCurrentWindow();
  const maximized = await current.isMaximized();
  if (maximized) await current.unmaximize();
  else await current.maximize();
}

export async function closeWindow() {
  if (!isTauriDesktop()) return;
  await getCurrentWindow().close();
}

export async function openQueryWindow(sql?: string) {
  if (!isTauriDesktop()) {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (sql) url.searchParams.set("sql", sql);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    }
    return;
  }

  await invoke("open_query_window", { sql: sql ?? null });
}
