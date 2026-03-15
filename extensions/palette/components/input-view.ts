/**
 * Text input view for the palette shell. Renders content only
 * (no border chrome). Used by io.input().
 */

import { getEditorKeybindings, Input } from "@mariozechner/pi-tui";
import type { PaletteView } from "./palette-view";

export interface InputViewOptions {
  title: string;
  initialValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export class InputView implements PaletteView {
  readonly title: string;

  private readonly input = new Input();

  constructor(private readonly options: InputViewOptions) {
    this.title = options.title;

    if (options.initialValue) {
      this.input.setValue(options.initialValue);
    }

    this.input.onSubmit = () => {
      const value = this.input.getValue().trim();
      if (value) {
        this.options.onSubmit(value);
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

    if (kb.matches(data, "selectConfirm")) {
      this.input.onSubmit?.(this.input.getValue());
      return true;
    }

    this.input.handleInput(data);
    return true;
  }

  renderContent(width: number): string[] {
    const inputLine = this.input.render(width)[0] ?? "> ";
    return [inputLine.slice(2)];
  }
}
