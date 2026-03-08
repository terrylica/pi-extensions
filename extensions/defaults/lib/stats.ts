import type { ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { formatTokens } from "./utils";

// Context usage thresholds for color coding
export const CONTEXT_WARNING_THRESHOLD = 35;
export const CONTEXT_ERROR_THRESHOLD = 50;

interface CumulativeUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

interface ContextUsage {
  window: number;
  percent: number;
  display: string;
}

/**
 * Calculate cumulative usage from session entries
 */
export function getCumulativeUsage(ctx: ExtensionContext): CumulativeUsage {
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;
  let totalCost = 0;

  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "message" && entry.message.role === "assistant") {
      const usage = entry.message.usage;
      totalInput += usage.input;
      totalOutput += usage.output;
      totalCacheRead += usage.cacheRead;
      totalCacheWrite += usage.cacheWrite;
      totalCost += usage.cost.total;
    }
  }

  return {
    input: totalInput,
    output: totalOutput,
    cacheRead: totalCacheRead,
    cacheWrite: totalCacheWrite,
    cost: totalCost,
  };
}

/**
 * Get context usage from session
 */
export function getContextUsage(
  ctx: ExtensionContext,
): ContextUsage | undefined {
  const contextUsage = ctx.getContextUsage();
  if (!contextUsage) return undefined;

  const contextWindow =
    contextUsage.contextWindow ?? ctx.model?.contextWindow ?? 0;
  const contextPercentValue = contextUsage?.percent ?? 0;
  const contextPercent =
    contextUsage?.percent !== null ? contextPercentValue.toFixed(1) : "?";

  return {
    window: contextWindow,
    percent: contextPercentValue,
    display:
      contextPercent === "?"
        ? `?/${formatTokens(contextWindow)}`
        : `${contextPercent}%/${formatTokens(contextWindow)}`,
  };
}

/**
 * Build stats parts for footer line 1 right side
 */
export function buildStatsParts(
  theme: Theme,
  usage: CumulativeUsage,
  contextUsage: ContextUsage | undefined,
  tpsStr: string,
): string[] {
  const parts: string[] = [];

  if (tpsStr) parts.push(tpsStr);
  if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
  if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
  if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
  if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);

  if (usage.cost) {
    const costStr = `$${usage.cost.toFixed(3)}`;
    parts.push(costStr);
  }

  if (contextUsage) {
    let contextPercentStr: string;
    if (contextUsage.percent > CONTEXT_ERROR_THRESHOLD) {
      contextPercentStr = theme.fg("error", contextUsage.display);
    } else if (contextUsage.percent > CONTEXT_WARNING_THRESHOLD) {
      contextPercentStr = theme.fg("warning", contextUsage.display);
    } else {
      contextPercentStr = contextUsage.display;
    }
    parts.push(contextPercentStr);
  }

  return parts;
}

/**
 * Build minimal stats for small screens (context used + price only)
 */
export function buildMinimalStatsParts(
  theme: Theme,
  usage: CumulativeUsage,
  contextUsage: ContextUsage | undefined,
): string[] {
  const parts: string[] = [];

  if (contextUsage) {
    let contextPercentStr: string;
    if (contextUsage.percent > CONTEXT_ERROR_THRESHOLD) {
      contextPercentStr = theme.fg("error", contextUsage.display);
    } else if (contextUsage.percent > CONTEXT_WARNING_THRESHOLD) {
      contextPercentStr = theme.fg("warning", contextUsage.display);
    } else {
      contextPercentStr = contextUsage.display;
    }
    parts.push(contextPercentStr);
  }

  if (usage.cost) {
    const costStr = `$${usage.cost.toFixed(3)}`;
    parts.push(costStr);
  }

  return parts;
}
