import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupUsageCommands } from "./commands";
import { setupUsageHooks } from "./hooks";
// import { registerAllProviders } from "./providers";

export default function providersExtension(pi: ExtensionAPI): void {
  // Provider registrations disabled - using core providers instead
  // registerAllProviders(pi);
  setupUsageCommands(pi);
  setupUsageHooks(pi);
}
