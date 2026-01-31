import type { Theme } from "@mariozechner/pi-coding-agent";
import { DynamicBorder, getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import type { Component } from "@mariozechner/pi-tui";
import { Markdown, Text } from "@mariozechner/pi-tui";

/**
 * Renders:
 *   ──────────────── (full-width dynamic border)
 *   (empty line)
 *   <markdown content>
 *   (empty line)
 */
export class MarkdownResponse implements Component {
  private border: DynamicBorder;

  constructor(
    private content: string,
    theme: Theme,
  ) {
    this.border = new DynamicBorder((s) => theme.fg("muted", s));
  }

  handleInput(_data: string): boolean {
    return false;
  }

  invalidate(): void {}

  render(width: number): string[] {
    if (!this.content) return [];

    const lines: string[] = [];

    lines.push(...this.border.render(width));
    lines.push("");

    try {
      const mdTheme = getMarkdownTheme();
      const md = new Markdown(this.content, 0, 0, mdTheme);
      lines.push(...md.render(width));
    } catch {
      const text = new Text(this.content, 0, 0);
      lines.push(...text.render(width));
    }

    lines.push("");
    return lines;
  }
}
