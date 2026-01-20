import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupCommands } from "./commands";
import { setupHooks } from "./hooks";
import { setupTools } from "./lib/tools";

export default function (pi: ExtensionAPI) {
  setupHooks(pi);
  setupCommands(pi);
  setupTools(pi);
}
