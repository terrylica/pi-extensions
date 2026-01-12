/**
 * Scout subagent tools.
 */

import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { fetchUrlTool } from "./fetch-url";
import { githubTool } from "./github";
import { searchTool } from "./search";

/** Create scout tools array */
export function createScoutTools(): ToolDefinition[] {
  return [fetchUrlTool, searchTool, githubTool] as unknown as ToolDefinition[];
}

export { fetchUrlTool, githubTool, searchTool };
