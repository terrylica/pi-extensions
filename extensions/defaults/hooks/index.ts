import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupEditorShellIndicatorHook } from "./editor-shell-indicator";
import { setupEditorStashHook } from "./editor-stash";
import { setupEventCompatHook } from "./event-compat";
import { setupFooterHook } from "./footer";
import { setupNotificationHook } from "./notification";
import { setupPaletteRegistration } from "./palette";
import { setupSessionNameHook } from "./session-name";
import { setupTerminalTitleHook } from "./terminal-title";

export function setupHooks(pi: ExtensionAPI) {
  setupSessionNameHook(pi);
  setupTerminalTitleHook(pi);
  setupEventCompatHook(pi);
  setupNotificationHook(pi);
  setupFooterHook(pi);
  setupEditorShellIndicatorHook(pi);
  setupEditorStashHook(pi);
  setupPaletteRegistration(pi);
}
