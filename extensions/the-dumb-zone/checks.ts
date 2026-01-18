import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { AssistantMessage, TextContent } from "@mariozechner/pi-ai";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
  CONTEXT_THRESHOLDS,
  DUMB_ZONE_PATTERNS,
  POST_COMPACTION_MULTIPLIER,
} from "./constants";

// ============================================================================
// TYPES
// ============================================================================

export interface DumbZoneCheckResult {
  /** Whether we're in the dumb zone */
  inZone: boolean;
  /** Current context utilization percentage */
  utilization: number;
  /** Effective threshold being used */
  threshold: number;
  /** Whether session has been compacted */
  compacted: boolean;
  /** Type of violation if inZone is true */
  violationType?: "quantitative" | "pattern";
  /** Details for display */
  details: string;
}

// ============================================================================
// SESSION ANALYSIS
// ============================================================================

/**
 * Check if session has been compacted.
 */
export function hasCompacted(ctx: ExtensionContext): boolean {
  const entries = ctx.sessionManager.getEntries();
  return entries.some((entry) => entry.type === "compaction");
}

/**
 * Get effective context threshold based on compaction status.
 */
export function getEffectiveThreshold(
  baseThreshold: number,
  compacted: boolean,
): number {
  if (compacted) {
    return baseThreshold * POST_COMPACTION_MULTIPLIER;
  }
  return baseThreshold;
}

/**
 * Calculate total input tokens from session.
 */
function calculateInputTokens(ctx: ExtensionContext): number {
  let inputTokens = 0;

  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "message" && entry.message.role === "assistant") {
      const message = entry.message as AssistantMessage;
      inputTokens += message.usage.input;
    }
  }

  return inputTokens;
}

/**
 * Calculate context window utilization percentage.
 */
export function getContextUtilization(ctx: ExtensionContext): number {
  const contextWindow = ctx.model?.contextWindow;

  if (!contextWindow || contextWindow === 0) return 0;

  const inputTokens = calculateInputTokens(ctx);
  return (inputTokens / contextWindow) * 100;
}

// ============================================================================
// MESSAGE ANALYSIS
// ============================================================================

/**
 * Type guard for assistant messages.
 */
export function isAssistantMessage(
  message: AgentMessage,
): message is AssistantMessage {
  return message.role === "assistant" && Array.isArray(message.content);
}

/**
 * Extract text content from assistant message.
 */
export function getTextContent(message: AssistantMessage): string {
  return message.content
    .filter((block): block is TextContent => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/**
 * Check if text matches dumb zone phrase patterns.
 */
export function matchesDumbZonePatterns(text: string): boolean {
  return DUMB_ZONE_PATTERNS.some((pattern) => pattern.test(text));
}

// ============================================================================
// MAIN CHECK
// ============================================================================

/**
 * Check if we've entered the dumb zone.
 * Combines quantitative (context usage) and qualitative (phrase patterns) checks.
 */
export function checkDumbZone(
  ctx: ExtensionContext,
  messages: AgentMessage[],
): DumbZoneCheckResult {
  const utilization = getContextUtilization(ctx);
  const compacted = hasCompacted(ctx);
  const threshold = getEffectiveThreshold(CONTEXT_THRESHOLDS.DANGER, compacted);

  // Primary check: Quantitative context utilization
  if (utilization >= threshold) {
    const details = compacted
      ? `Context: ${utilization.toFixed(1)}% (threshold: ${threshold.toFixed(1)}%, post-compaction)`
      : `Context: ${utilization.toFixed(1)}% (threshold: ${threshold.toFixed(1)}%)`;

    return {
      inZone: true,
      utilization,
      threshold,
      compacted,
      violationType: "quantitative",
      details,
    };
  }

  // Supplementary check: Phrase patterns in last assistant message
  const lastAssistant = [...messages].reverse().find(isAssistantMessage);
  if (lastAssistant) {
    const text = getTextContent(lastAssistant);
    if (matchesDumbZonePatterns(text)) {
      const details = `Context: ${utilization.toFixed(1)}% | Detected concerning patterns`;
      return {
        inZone: true,
        utilization,
        threshold,
        compacted,
        violationType: "pattern",
        details,
      };
    }
  }

  // All clear
  return {
    inZone: false,
    utilization,
    threshold,
    compacted,
    details: "",
  };
}
