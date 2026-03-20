/**
 * Generic fuzzy picker overlay. Reusable by any command that needs
 * a filterable list selection.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { Component } from "@mariozechner/pi-tui";
import {
  fuzzyFilter,
  Input,
  truncateToWidth,
  visibleWidth,
} from "@mariozechner/pi-tui";
import type { PickItem, PickResult } from "../registry/types";

type Theme = ExtensionContext["ui"]["theme"];
type KeybindingsLike = {
  matches(data: string, id: string): boolean;
};

export class FuzzyPickerOverlay implements Component {
  private readonly input = new Input();
  private selectedIndex = 0;
  private filtered: PickItem[];

  constructor(
    private readonly theme: Theme,
    private readonly keybindings: KeybindingsLike,
    private readonly title: string,
    private readonly emptyText: string,
    private readonly items: PickItem[],
    private readonly done: (result: PickResult | null) => void,
    initialQuery?: string,
  ) {
    this.filtered = items;

    if (initialQuery) {
      this.input.setValue(initialQuery);
      this.updateFilter(initialQuery);
    }

    this.input.onSubmit = () => {
      const item = this.filtered[this.selectedIndex];
      this.done(
        item
          ? { value: item.value, query: this.input.getValue().trim() }
          : null,
      );
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

    if (kb.matches(data, "tui.select.up") || data === "k") {
      this.moveSelection(-1);
      return true;
    }

    if (kb.matches(data, "tui.select.down") || data === "j") {
      this.moveSelection(1);
      return true;
    }

    if (kb.matches(data, "tui.select.confirm")) {
      this.input.onSubmit?.(this.input.getValue());
      return true;
    }

    this.input.handleInput(data);
    this.updateFilter(this.input.getValue());
    return true;
  }

  render(width: number): string[] {
    const theme = this.theme;
    const border = (s: string) => theme.fg("dim", s);
    const accent = (s: string) => theme.fg("accent", s);
    const muted = (s: string) => theme.fg("muted", s);

    const innerWidth = width - 4;

    const pad = (s: string): string => {
      const w = visibleWidth(s);
      if (w > innerWidth) return truncateToWidth(s, innerWidth);
      return s + " ".repeat(innerWidth - w);
    };
    const row = (content: string): string =>
      `${border("│")} ${pad(content)} ${border("│")}`;
    const emptyRow = (): string => row("");
    const divider = (): string => border(`├${"─".repeat(width - 2)}┤`);

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

    // Search input
    const inputLine = this.input.render(innerWidth)[0] ?? "> ";
    lines.push(row(inputLine.slice(2)));

    // Divider
    lines.push(divider());

    // Item list (fixed height)
    const listHeight = Math.max(this.items.length, 7);
    for (let i = 0; i < listHeight; i++) {
      if (this.filtered.length === 0 && i === 0) {
        lines.push(row(muted(this.emptyText)));
        continue;
      }
      const item = this.filtered[i];
      if (!item) {
        lines.push(emptyRow());
        continue;
      }

      const selected = i === this.selectedIndex;
      const label = selected ? accent(item.label) : item.label;
      const description = item.description ? muted(` ${item.description}`) : "";
      lines.push(row(`${label}${description}`));
    }

    // Bottom border
    lines.push(border(`╰${"─".repeat(width - 2)}╯`));

    return lines;
  }

  invalidate(): void {}

  private moveSelection(delta: number): void {
    if (this.filtered.length === 0) return;
    this.selectedIndex =
      (this.selectedIndex + delta + this.filtered.length) %
      this.filtered.length;
  }

  private updateFilter(query: string): void {
    const q = query.trim();
    this.filtered = q
      ? fuzzyFilter(
          this.items,
          q,
          (item) =>
            `${item.label} ${item.description ?? ""} ${item.keywords ?? ""}`,
        )
      : this.items;

    if (this.filtered.length === 0) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = Math.min(this.selectedIndex, this.filtered.length - 1);
  }
}
