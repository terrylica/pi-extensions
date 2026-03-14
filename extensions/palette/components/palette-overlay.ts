/**
 * The main palette overlay component. Displays a fuzzy-filterable list
 * of commands and returns the selected command ID via done().
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { Component } from "@mariozechner/pi-tui";
import {
  fuzzyFilter,
  getEditorKeybindings,
  Input,
  truncateToWidth,
  visibleWidth,
} from "@mariozechner/pi-tui";
import type { CommandView } from "../commands/open-palette";

type Theme = ExtensionContext["ui"]["theme"];

export class PaletteOverlay implements Component {
  private readonly searchInput = new Input();
  private selectedIndex = 0;
  private filtered: CommandView[];

  constructor(
    private readonly theme: Theme,
    private readonly views: CommandView[],
    private readonly done: (result: string | null) => void,
  ) {
    this.filtered = views;

    this.searchInput.onSubmit = () => {
      const view = this.filtered[this.selectedIndex];
      if (!view || !view.enabled) return;
      this.done(view.command.id);
    };

    this.searchInput.onEscape = () => {
      this.done(null);
    };
  }

  handleInput(data: string): boolean {
    const kb = getEditorKeybindings();

    if (kb.matches(data, "selectCancel")) {
      this.done(null);
      return true;
    }

    if (kb.matches(data, "selectUp") || data === "k") {
      this.moveSelection(-1);
      return true;
    }

    if (kb.matches(data, "selectDown") || data === "j") {
      this.moveSelection(1);
      return true;
    }

    if (kb.matches(data, "selectConfirm")) {
      this.searchInput.onSubmit?.(this.searchInput.getValue());
      return true;
    }

    this.searchInput.handleInput(data);
    this.updateFilter(this.searchInput.getValue());
    return true;
  }

  render(width: number): string[] {
    const theme = this.theme;
    const border = (s: string) => theme.fg("dim", s);
    const accent = (s: string) => theme.fg("accent", s);
    const dim = (s: string) => theme.fg("dim", s);
    const muted = (s: string) => theme.fg("muted", s);

    const innerWidth = width - 4; // "│ " + content + " │"

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
    const title = " Palette ";
    const titleW = visibleWidth(title);
    const rightDash = Math.max(0, width - 2 - 2 - titleW);
    lines.push(
      border(`╭──`) + accent(title) + border(`${"─".repeat(rightDash)}╮`),
    );

    // Search input
    const inputLine = this.searchInput.render(innerWidth)[0] ?? "> ";
    lines.push(row(inputLine.slice(2)));

    // Divider
    lines.push(divider());

    // Command list (fixed height)
    const listHeight = Math.max(this.views.length, 7);
    for (let i = 0; i < listHeight; i++) {
      const view = this.filtered[i];
      if (!view) {
        lines.push(emptyRow());
        continue;
      }

      const selected = i === this.selectedIndex;
      const titleText = view.command.title;
      const label = !view.enabled
        ? dim(titleText)
        : selected
          ? accent(titleText)
          : titleText;

      const desc = view.command.description
        ? muted(` ${view.command.description}`)
        : "";

      const disabledHint =
        !view.enabled && view.disabledReason
          ? dim(` [${view.disabledReason}]`)
          : "";

      lines.push(row(`${label}${desc}${disabledHint}`));
    }

    // Bottom border
    lines.push(border(`╰${"─".repeat(width - 2)}╯`));

    return lines;
  }

  invalidate(): void {}

  private moveSelection(delta: number): void {
    if (this.filtered.length === 0) return;

    const enabledIndexes = this.filtered
      .map((view, index) => (view.enabled ? index : -1))
      .filter((index) => index >= 0);

    if (enabledIndexes.length === 0) {
      this.selectedIndex =
        (this.selectedIndex + delta + this.filtered.length) %
        this.filtered.length;
      return;
    }

    const currentEnabledPos = enabledIndexes.indexOf(this.selectedIndex);
    const basePos =
      currentEnabledPos >= 0 ? currentEnabledPos : delta >= 0 ? -1 : 0;
    const nextPos =
      (basePos + delta + enabledIndexes.length) % enabledIndexes.length;
    this.selectedIndex = enabledIndexes[nextPos] ?? enabledIndexes[0] ?? 0;
  }

  private updateFilter(query: string): void {
    const q = query.trim();
    const filtered = q
      ? fuzzyFilter(this.views, q, (view) => view.searchText)
      : this.views;

    const enabled = filtered.filter((view) => view.enabled);
    const disabled = filtered.filter((view) => !view.enabled);
    this.filtered = [...enabled, ...disabled];

    if (this.filtered.length === 0) {
      this.selectedIndex = 0;
      return;
    }

    this.selectedIndex =
      enabled.length > 0
        ? 0
        : Math.min(this.selectedIndex, this.filtered.length - 1);
  }
}
