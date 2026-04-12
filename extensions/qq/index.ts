import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerQqCommand } from "./commands/qq";
import { setupQqContextFilter } from "./hooks/context-filter";
import { registerQqRenderer } from "./lib/renderer";

export default async function (pi: ExtensionAPI): Promise<void> {
  registerQqCommand(pi);
  registerQqRenderer(pi);
  setupQqContextFilter(pi);
}
