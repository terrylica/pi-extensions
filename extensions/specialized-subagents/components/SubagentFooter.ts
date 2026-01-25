import type { Theme } from "@mariozechner/pi-coding-agent";
import type { Component } from "@mariozechner/pi-tui";
import { truncateToWidth } from "@mariozechner/pi-tui";

import type { SubagentToolCall, SubagentUsage } from "../lib/types";
import { formatCost, formatTokenCount } from "../lib/ui/stats";

export interface ResolvedModelRef {
  provider: string;
  id: string;
}

export interface SubagentFooterData {
  resolvedModel?: ResolvedModelRef;
  usage?: SubagentUsage;
  toolCalls?: SubagentToolCall[];
  familyUnknown?: boolean;
}

/**
 * Single-line, always-truncated footer for specialized subagents.
 *
 * Rendering rules:
 * - Always returns exactly one line.
 * - Never wraps (uses truncateToWidth()).
 * - Shows resolved provider/model, output tokens (if available), cost (if available),
 *   tool call counts (total + failed), and optional unknown-family warning marker.
 */
export class SubagentFooter implements Component {
  constructor(
    private theme: Theme,
    private data: SubagentFooterData,
  ) {}

  handleInput(_data: string): boolean {
    return false;
  }

  invalidate(): void {}

  render(width: number): string[] {
    const th = this.theme;
    const { resolvedModel, usage, toolCalls, familyUnknown } = this.data;

    const parts: string[] = [];

    if (resolvedModel) {
      parts.push(`${resolvedModel.provider}/${resolvedModel.id}`);
    }

    if (usage?.outputTokens !== undefined) {
      parts.push(`${formatTokenCount(usage.outputTokens)} tokens`);
    }

    if (usage?.totalCost !== undefined && usage.totalCost > 0) {
      parts.push(formatCost(usage.totalCost));
    }

    const totalCalls = toolCalls?.length ?? 0;
    const failedCalls =
      toolCalls?.filter((tc) => tc.status === "error").length ?? 0;
    const callsText =
      failedCalls > 0
        ? `${totalCalls} calls (${failedCalls} failed)`
        : `${totalCalls} calls`;

    parts.push(callsText);

    const base = th.fg("muted", parts.join(" - "));

    const line = familyUnknown
      ? `${base}${th.fg("muted", " - ")}${th.fg("warning", "unknown-family")}`
      : base;

    return [truncateToWidth(line, width)];
  }
}
