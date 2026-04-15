import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerIntrospectCommand } from "./commands/introspect";

export default function (pi: ExtensionAPI) {
  registerIntrospectCommand(pi);
}
