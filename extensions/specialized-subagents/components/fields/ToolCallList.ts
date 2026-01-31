import type { Theme } from "@mariozechner/pi-coding-agent";
import type { Component } from "@mariozechner/pi-tui";
import { TruncatedText } from "@mariozechner/pi-tui";
import type { SubagentToolCall } from "../../lib/types";
import { getSpinnerFrame, INDICATOR } from "../../lib/ui/spinner";

export type ToolCallFormatter = (tc: SubagentToolCall) => {
  label: string;
  detail?: string;
};

/**
 * Renders all tool calls with status indicators:
 *
 *   Tool calls (7):
 *     [checkmark] Read src/utils/math.js
 *     [checkmark] Write src/utils/math.ts
 *     [spinner] Bash npx tsc --noEmit
 *     [x] Edit src/broken.ts
 */
export class ToolCallList implements Component {
  constructor(
    private toolCalls: SubagentToolCall[],
    private formatter: ToolCallFormatter,
    private theme: Theme,
    private spinnerFrame?: number,
  ) {}

  handleInput(_data: string): boolean {
    return false;
  }

  invalidate(): void {}

  render(width: number): string[] {
    if (this.toolCalls.length === 0) return [];

    const th = this.theme;
    const lines: string[] = [];

    lines.push(th.fg("muted", `Tool calls (${this.toolCalls.length}):`));

    for (const tc of this.toolCalls) {
      const indicator =
        tc.status === "running"
          ? getSpinnerFrame(this.spinnerFrame ?? 0)
          : tc.status === "done"
            ? th.fg("success", INDICATOR.done)
            : th.fg("error", INDICATOR.error);

      const { label, detail } = this.formatter(tc);
      const text = detail ? `${th.bold(label)} ${detail}` : th.bold(label);
      const line = new TruncatedText(`  ${indicator} ${text}`);
      lines.push(...line.render(width));
    }

    return lines;
  }
}
