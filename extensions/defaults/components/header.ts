/**
 * Custom header showing harness shortcuts and commands.
 *
 * Instead of the built-in keybinding hints, displays only
 * the custom shortcuts and commands defined in harness extensions.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from "@mariozechner/pi-coding-agent";
import { rawKeyHint } from "@mariozechner/pi-coding-agent";

// Custom shortcuts defined in harness extensions.
const SHORTCUTS: { key: string; description: string }[] = [
  { key: "ctrl+p", description: "command palette" },
  { key: "ctrl+shift+s", description: "stash editor" },
  { key: "ctrl+shift+r", description: "pop stash" },
];

// Custom commands defined in harness extensions.
const COMMANDS: { name: string; description: string }[] = [
  { name: "btw", description: "side question" },
  { name: "spawn", description: "new linked session" },
  { name: "continue", description: "resume recent session" },
  { name: "plan:save", description: "save plan from conversation" },
  { name: "plan:list", description: "list/manage plans" },
  { name: "project:init", description: "init project config" },
  { name: "providers:usage", description: "usage dashboard" },
];

function renderHeader(_width: number, theme: Theme): string[] {
  const shortcuts = SHORTCUTS.map((s) => rawKeyHint(s.key, s.description)).join(
    "\n",
  );

  const commands = COMMANDS.map((c) =>
    rawKeyHint(`/${c.name}`, c.description),
  ).join("\n");

  return [
    theme.fg("muted", "Shortcuts"),
    shortcuts,
    "",
    theme.fg("muted", "Commands"),
    commands,
  ];
}

export function createCustomHeader(_pi: ExtensionAPI) {
  return {
    setup: (ctx: ExtensionContext) => {
      if (!ctx.hasUI) return;

      ctx.ui.setHeader((_tui: unknown, theme: Theme) => ({
        render(width: number): string[] {
          return renderHeader(width, theme);
        },
        invalidate() {},
      }));
    },
    cleanup: (ctx?: ExtensionContext) => {
      ctx?.ui.setHeader(undefined);
    },
  };
}
