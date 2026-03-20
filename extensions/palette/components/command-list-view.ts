/**
 * The root palette view: a fuzzy-filterable command list.
 * Renders a multi-column layout inspired by Amp:
 *   [group]  title  description  [shortcut]
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
  fuzzyFilter,
  Input,
  truncateToWidth,
  visibleWidth,
} from "@mariozechner/pi-tui";
import type { CommandView } from "../commands/open-palette";
import type { PaletteView } from "./palette-view";

type Theme = ExtensionContext["ui"]["theme"];
type KeybindingsLike = {
  matches(data: string, id: string): boolean;
};

const MIN_VISIBLE_ROWS = 5;
const MAX_VISIBLE_ROWS = 12;

function clampVisibleRows(count: number, available: number): number {
  if (count <= 0) return 1;
  return Math.min(
    Math.max(count, MIN_VISIBLE_ROWS),
    MAX_VISIBLE_ROWS,
    available,
  );
}

export class CommandListView implements PaletteView {
  readonly title = "Palette";

  private readonly searchInput = new Input();
  private selectedIndex = 0;
  private filtered: CommandView[];
  private readonly groupColWidth: number;

  constructor(
    private readonly theme: Theme,
    private readonly keybindings: KeybindingsLike,
    private readonly views: CommandView[],
    private readonly onSelect: (commandId: string) => void,
    private readonly onCancel: () => void,
  ) {
    this.filtered = views;

    // Precompute group column width from the longest group label.
    let maxGroup = 0;
    for (const v of views) {
      const g = v.command.group ?? "";
      if (g.length > maxGroup) maxGroup = g.length;
    }
    this.groupColWidth = maxGroup > 0 ? maxGroup + 1 : 0;

    this.searchInput.onSubmit = () => {
      const view = this.filtered[this.selectedIndex];
      if (!view || !view.enabled) return;
      this.onSelect(view.command.id);
    };

    this.searchInput.onEscape = () => {
      this.onCancel();
    };
  }

  handleInput(data: string): boolean {
    const kb = this.keybindings;

    if (kb.matches(data, "tui.select.cancel")) {
      this.onCancel();
      return true;
    }

    if (kb.matches(data, "tui.select.up")) {
      this.moveSelection(-1);
      return true;
    }

    if (kb.matches(data, "tui.select.down")) {
      this.moveSelection(1);
      return true;
    }

    if (kb.matches(data, "tui.select.confirm")) {
      this.searchInput.onSubmit?.(this.searchInput.getValue());
      return true;
    }

    this.searchInput.handleInput(data);
    this.updateFilter(this.searchInput.getValue());
    return true;
  }

  renderContent(width: number, height: number): string[] {
    const lines: string[] = [];

    // Search input
    const inputLine = this.searchInput.render(width)[0] ?? "> ";
    lines.push(inputLine.slice(2));

    // Separator
    lines.push(this.theme.fg("dim", "─".repeat(width)));

    const availableListHeight = Math.max(1, height - 2);
    const listCount = this.filtered.length;
    const listHeight = clampVisibleRows(listCount, availableListHeight);
    const selectedFilteredIndex = Math.min(
      this.selectedIndex,
      Math.max(0, this.filtered.length - 1),
    );
    const startIndex = Math.max(
      0,
      Math.min(
        Math.max(0, this.filtered.length - listHeight),
        selectedFilteredIndex - Math.floor(listHeight / 2),
      ),
    );

    if (listCount === 0) {
      lines.push(this.theme.fg("muted", "No commands"));
      return lines;
    }

    for (let i = 0; i < listHeight; i++) {
      const filteredIndex = startIndex + i;
      const view = this.filtered[filteredIndex];
      if (!view) break;

      const selected = filteredIndex === this.selectedIndex;
      lines.push(this.renderRow(view, selected, width));
    }

    return lines;
  }

  private renderRow(
    view: CommandView,
    selected: boolean,
    width: number,
  ): string {
    const theme = this.theme;
    const accent = (s: string) => theme.fg("accent", s);
    const dim = (s: string) => theme.fg("dim", s);
    const muted = (s: string) => theme.fg("muted", s);

    const parts: string[] = [];
    let usedWidth = 0;

    // Column 1: right-aligned group label (fixed width)
    if (this.groupColWidth > 0) {
      const groupText = (view.command.group ?? "").toLowerCase();
      const padded = groupText.padStart(this.groupColWidth);
      parts.push(dim(padded));
      parts.push("  ");
      usedWidth += this.groupColWidth + 2;
    }

    // Column 3 (computed first to reserve space): shortcut hint
    const shortcut = view.command.shortcutLabel ?? "";
    const shortcutWidth = shortcut.length > 0 ? shortcut.length + 2 : 0;

    // Column 2: title + description (flexible, fills remaining space)
    const mainWidth = width - usedWidth - shortcutWidth;
    const titleText = view.command.title;
    const label = !view.enabled
      ? dim(titleText)
      : selected
        ? accent(titleText)
        : titleText;

    let mainText: string;
    if (!view.enabled) {
      const reason = view.disabledReason
        ? dim(` [${view.disabledReason}]`)
        : "";
      mainText = `${label}${reason}`;
    } else {
      const desc = view.command.description
        ? muted(` ${view.command.description}`)
        : "";
      mainText = `${label}${desc}`;
    }
    parts.push(truncateToWidth(mainText, mainWidth));

    // Pad to push shortcut to the right
    const mainVisible = visibleWidth(truncateToWidth(mainText, mainWidth));
    const gap = Math.max(0, mainWidth - mainVisible);
    if (gap > 0) parts.push(" ".repeat(gap));

    // Column 3: shortcut
    if (shortcut.length > 0) {
      parts.push("  ");
      parts.push(dim(shortcut));
    }

    return truncateToWidth(parts.join(""), width);
  }

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
