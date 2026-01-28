import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerGeminiProvider } from "./gemini";
import { registerMoonshotProvider } from "./moonshot";
import { registerOcProvider } from "./oc";
import { registerOcAnthropicProvider } from "./oc-ant";

export function registerAllProviders(pi: ExtensionAPI): void {
  registerGeminiProvider(pi);
  registerMoonshotProvider(pi);
  registerOcProvider(pi);
  registerOcAnthropicProvider(pi);
}
