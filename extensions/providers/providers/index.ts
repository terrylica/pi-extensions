import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerGeminiProvider } from "./gemini";
import { registerMoonshotProvider } from "./moonshot";

export function registerAllProviders(pi: ExtensionAPI): void {
  registerGeminiProvider(pi);
  registerMoonshotProvider(pi);
}
