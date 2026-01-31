import type { Theme } from "@mariozechner/pi-coding-agent";
import type { Component } from "@mariozechner/pi-tui";
import { TruncatedText } from "@mariozechner/pi-tui";

/**
 * Renders:
 *   Files:
 *     src/utils/math.js
 *     src/utils/string.js
 */
export class FileList implements Component {
  constructor(
    private files: string[],
    private theme: Theme,
  ) {}

  handleInput(_data: string): boolean {
    return false;
  }

  invalidate(): void {}

  render(width: number): string[] {
    if (this.files.length === 0) return [];

    const th = this.theme;
    const lines: string[] = [];
    lines.push(th.fg("muted", "Files:"));
    for (const f of this.files) {
      const line = new TruncatedText(`  ${f}`);
      lines.push(...line.render(width));
    }
    return lines;
  }
}
