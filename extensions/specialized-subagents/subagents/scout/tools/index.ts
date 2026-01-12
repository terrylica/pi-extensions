/**
 * Scout subagent tools.
 */

import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { githubCommitsTool } from "./github-commits";
import { githubContentTool } from "./github-content";
import { githubIssueTool } from "./github-issue";
import { githubSearchTool } from "./github-search";
import { webFetchTool } from "./web-fetch";
import { webSearchTool } from "./web-search";

/** Create scout tools array */
export function createScoutTools(): ToolDefinition[] {
  return [
    webFetchTool,
    webSearchTool,
    githubContentTool,
    githubSearchTool,
    githubCommitsTool,
    githubIssueTool,
  ] as unknown as ToolDefinition[];
}

export {
  githubCommitsTool,
  githubContentTool,
  githubIssueTool,
  githubSearchTool,
  webFetchTool,
  webSearchTool,
};
