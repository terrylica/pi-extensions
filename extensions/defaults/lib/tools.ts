import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupBashTool } from "../tools/bash";
import { setupFindTool } from "../tools/find";
import { setupGetCurrentTimeTool } from "../tools/get-current-time";
import { setupGrepTool } from "../tools/grep";
import { setupReadTool } from "../tools/read";
import { setupReadUrlTool } from "../tools/read-url";

export function setupTools(pi: ExtensionAPI): void {
  setupReadTool(pi);
  setupFindTool(pi);
  setupGrepTool(pi);
  setupBashTool(pi);
  setupGetCurrentTimeTool(pi);
  setupReadUrlTool(pi);
}
