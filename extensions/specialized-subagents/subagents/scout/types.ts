/**
 * Scout subagent types.
 */

import type { SubagentToolCall, SubagentUsage } from "../../lib/types";

/** Input parameters for the scout subagent */
export interface ScoutInput {
  /** URL to fetch content from */
  url?: string;
  /** Search query for online research */
  query?: string;
  /** Question to answer based on fetched content */
  prompt?: string;
}

/** Details structure for scout tool rendering */
export interface ScoutDetails {
  /** URL input */
  url?: string;
  /** Query input */
  query?: string;
  /** Prompt input */
  prompt?: string;
  /** Tool calls made by the subagent */
  toolCalls: SubagentToolCall[];
  /** Current spinner frame for animation */
  spinnerFrame: number;
  /** The scout's response (for final result) */
  response?: string;
  /** Whether the request was aborted */
  aborted?: boolean;
  /** Error message if failed */
  error?: string;
  /** Usage stats from the subagent */
  usage?: SubagentUsage;
}
