/**
 * Flow API factory. Creates a CommandIO backed by Pi's
 * ctx.ui.custom() overlays.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { SizeValue } from "@mariozechner/pi-tui";
import { FuzzyPickerOverlay } from "../components/fuzzy-picker-overlay";
import { TextInputOverlay } from "../components/text-input-overlay";
import type {
  CommandIO,
  InputOptions,
  PickOptions,
  PickResult,
} from "../registry/types";

export function createIO(ctx: ExtensionContext): CommandIO {
  return {
    async pick(options: PickOptions): Promise<PickResult | null> {
      return ctx.ui.custom<PickResult | null>(
        (_tui, theme, keybindings, done) =>
          new FuzzyPickerOverlay(
            theme,
            keybindings,
            options.title,
            options.emptyText ?? "No items",
            options.items,
            done,
            options.initialQuery,
          ),
        {
          overlay: true,
          overlayOptions: {
            width: options.width ?? ("60%" as SizeValue),
            maxHeight: options.maxHeight ?? ("80%" as SizeValue),
            anchor: "top-center",
          },
        },
      );
    },

    async input(options: InputOptions): Promise<string | null> {
      return ctx.ui.custom<string | null>(
        (_tui, theme, keybindings, done) =>
          new TextInputOverlay(theme, keybindings, options.title, done, {
            initialValue: options.initialValue,
            placeholder: options.placeholder,
          }),
        {
          overlay: true,
          overlayOptions: {
            width: options.width ?? ("60%" as SizeValue),
            maxHeight: options.maxHeight ?? ("30%" as SizeValue),
            anchor: "top-center",
          },
        },
      );
    },

    notify(message: string, level: "info" | "warning" | "error" = "info") {
      ctx.ui.notify(message, level);
    },
  };
}
