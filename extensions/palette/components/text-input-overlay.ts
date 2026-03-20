/**
 * Generic text input overlay. Used by commands that need free-form
 * text entry (e.g. session name, shell command).
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { Component } from "@mariozechner/pi-tui";
import { Input, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

type Theme = ExtensionContext["ui"]["theme"];
type KeybindingsLike = {
  matches(data: string, id: string): boolean;
};

export class TextInputOverlay implements Component {
  private readonly input = new Input();

  constructor(
    private readonly theme: Theme,
    private readonly keybindings: KeybindingsLike,
    private readonly title: string,
    private readonly done: (result: string | null) => void,
    options?: { initialValue?: string; placeholder?: string },
  ) {
    if (options?.initialValue) {
      this.input.setValue(options.initialValue);
    }

    this.input.onSubmit = () => {
      const value = this.input.getValue().trim();
      this.done(value || null);
    };

    this.input.onEscape = () => {
      this.done(null);
    };
  }

  handleInput(data: string): boolean {
    const kb = this.keybindings;

    if (kb.matches(data, "tui.select.cancel")) {
      this.done(null);
      return true;
    }

    if (kb.matches(data, "tui.select.confirm")) {
      this.input.onSubmit?.(this.input.getValue());
      return true;
    }

    this.input.handleInput(data);
    return true;
  }

  render(width: number): string[] {
    const theme = this.theme;
    const border = (s: string) => theme.fg("dim", s);
    const accent = (s: string) => theme.fg("accent", s);

    const innerWidth = width - 4;

    const pad = (s: string): string => {
      const w = visibleWidth(s);
      if (w > innerWidth) return truncateToWidth(s, innerWidth);
      return s + " ".repeat(innerWidth - w);
    };
    const row = (content: string): string =>
      `${border("│")} ${pad(content)} ${border("│")}`;

    const lines: string[] = [];

    // Top border with title
    const titleLabel = ` ${this.title} `;
    const titleW = visibleWidth(titleLabel);
    const rightDash = Math.max(0, width - 2 - 2 - titleW);
    lines.push(
      border(`\u256d\u2500\u2500`) +
        accent(titleLabel) +
        border(`${"\u2500".repeat(rightDash)}\u256e`),
    );

    // Input
    const inputLine = this.input.render(innerWidth)[0] ?? "> ";
    lines.push(row(inputLine.slice(2)));

    // Bottom border
    lines.push(border(`╰${"─".repeat(width - 2)}╯`));

    return lines;
  }

  invalidate(): void {}
}
