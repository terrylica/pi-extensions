/**
 * Lookout tools aggregator.
 */

import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { createAstGrepSearchTool } from "./ast-grep-search";
// import { createSemanticSearchTool } from "./semantic-search";

/** Create all custom tools for the Lookout subagent */
// biome-ignore lint/suspicious/noExplicitAny: ToolDefinition requires any for generic tool arrays
export function createLookoutTools(cwd: string): ToolDefinition<any, any>[] {
  return [createAstGrepSearchTool(cwd)];
  // return [createSemanticSearchTool(cwd)];
}
