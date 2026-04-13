import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerStashCommands } from "./commands/stash";
import { setupHooks } from "./hooks";

export default async function (pi: ExtensionAPI) {
  setupHooks(pi);
  registerStashCommands(pi);
}
