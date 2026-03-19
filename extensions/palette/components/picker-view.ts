/**
 * Fuzzy picker view for the palette shell. Renders content only
 * (no border chrome). Used by io.pick().
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
  fuzzyFilter,
  getEditorKeybindings,
  Input,
  truncateToWidth,
} from "@mariozechner/pi-tui";
import type { PickItem, PickResult } from "../registry/types";
import type { PaletteView } from "./palette-view";

type Theme = ExtensionContext["ui"]["theme"];

export interface PickerViewOptions {
  title: string;
  emptyText: string;
  items: PickItem[];
  initialQuery?: string;
  initialValue?: string;
  onSubmit: (result: PickResult) => void;
  onCancel: () => void;
}

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

export class PickerView implements PaletteView {
  readonly title: string;

  private readonly input = new Input();
  private selectedIndex = 0;
  private filtered: PickItem[];

  constructor(
    private readonly theme: Theme,
    private readonly options: PickerViewOptions,
  ) {
    this.title = options.title;
    this.filtered = options.items;

    if (options.initialQuery) {
      this.input.setValue(options.initialQuery);
      this.updateFilter(options.initialQuery);
    }

    if (options.initialValue) {
      this.selectValue(options.initialValue);
    }

    this.input.onSubmit = () => {
      const item = this.filtered[this.selectedIndex];
      if (item) {
        this.options.onSubmit({
          value: item.value,
          query: this.input.getValue().trim(),
        });
      }
    };

    this.input.onEscape = () => {
      this.options.onCancel();
    };
  }

  handleInput(data: string): boolean {
    const kb = getEditorKeybindings();

    if (kb.matches(data, "selectCancel")) {
      this.options.onCancel();
      return true;
    }

    if (kb.matches(data, "selectUp")) {
      this.moveSelection(-1);
      return true;
    }

    if (kb.matches(data, "selectDown")) {
      this.moveSelection(1);
      return true;
    }

    if (kb.matches(data, "selectConfirm")) {
      this.input.onSubmit?.(this.input.getValue());
      return true;
    }

    this.input.handleInput(data);
    this.updateFilter(this.input.getValue());
    return true;
  }

  renderContent(width: number, height: number): string[] {
    const theme = this.theme;
    const accent = (s: string) => theme.fg("accent", s);
    const muted = (s: string) => theme.fg("muted", s);

    const lines: string[] = [];

    // Search input
    const inputLine = this.input.render(width)[0] ?? "> ";
    lines.push(inputLine.slice(2));

    // Separator
    lines.push(theme.fg("dim", "─".repeat(width)));

    const availableListHeight = Math.max(1, height - 2);
    const listCount = this.filtered.length;
    const listHeight = clampVisibleRows(listCount, availableListHeight);
    const startIndex = Math.max(
      0,
      Math.min(
        Math.max(0, this.filtered.length - listHeight),
        this.selectedIndex - Math.floor(listHeight / 2),
      ),
    );

    if (listCount === 0) {
      lines.push(muted(this.options.emptyText));
      return lines;
    }

    for (let i = 0; i < listHeight; i++) {
      const filteredIndex = startIndex + i;
      const item = this.filtered[filteredIndex];
      if (!item) break;

      const selected = filteredIndex === this.selectedIndex;
      const label = selected ? accent(item.label) : item.label;
      const description = item.description ? muted(` ${item.description}`) : "";
      lines.push(truncateToWidth(`${label}${description}`, width));
    }

    return lines;
  }

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
          this.options.items,
          q,
          (item) =>
            `${item.label} ${item.description ?? ""} ${item.keywords ?? ""}`,
        )
      : this.options.items;

    if (this.filtered.length === 0) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = Math.min(this.selectedIndex, this.filtered.length - 1);
  }

  private selectValue(value: string): void {
    const index = this.filtered.findIndex((item) => item.value === value);
    if (index >= 0) this.selectedIndex = index;
  }
}
