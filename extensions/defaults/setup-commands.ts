import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerCommands } from "./commands";

export function setupCommands(pi: ExtensionAPI) {
  registerCommands(pi);
}
