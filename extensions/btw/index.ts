import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerBtwCommand } from "./commands/btw";
import { setupBtwContextFilter } from "./hooks/context-filter";
import { registerBtwRenderer } from "./lib/renderer";

export default async function (pi: ExtensionAPI): Promise<void> {
  registerBtwCommand(pi);
  registerBtwRenderer(pi);
  setupBtwContextFilter(pi);
}
