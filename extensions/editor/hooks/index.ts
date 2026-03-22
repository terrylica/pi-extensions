import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupEditorHook } from "./editor";

export function setupHooks(pi: ExtensionAPI) {
  setupEditorHook(pi);
}
