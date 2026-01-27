import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerGoogleProvider } from "./google";
import { registerMoonshotProvider } from "./moonshot";

export function registerAllProviders(pi: ExtensionAPI): void {
  registerGoogleProvider(pi);
  registerMoonshotProvider(pi);
}
