import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupFindSessionsTool } from "./find-sessions";
import { setupListSessionsTool } from "./list-sessions";
import { setupReadSessionTool } from "./read-session";

export { FIND_SESSIONS_GUIDANCE } from "./find-sessions";
export { LIST_SESSIONS_GUIDANCE } from "./list-sessions";
export { READ_SESSION_GUIDANCE } from "./read-session";

export function setupSessionTools(pi: ExtensionAPI) {
  setupFindSessionsTool(pi);
  setupListSessionsTool(pi);
  setupReadSessionTool(pi);
}
