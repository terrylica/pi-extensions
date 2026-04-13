import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupEventCompatHook } from "./event-compat";

export function setupHooks(pi: ExtensionAPI) {
  setupEventCompatHook(pi);
}
