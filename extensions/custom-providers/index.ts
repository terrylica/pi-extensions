import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerAllProviders } from "./providers";

export default function customProvidersExtension(pi: ExtensionAPI): void {
  registerAllProviders(pi);
}
