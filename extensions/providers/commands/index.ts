import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerProvidersSettings } from "./settings-command";
import { setupUsageCommand } from "./usage";

export function setupUsageCommands(pi: ExtensionAPI): void {
  setupUsageCommand(pi);
  registerProvidersSettings(pi);
}
