/**
 * Main entrypoint for opening the palette overlay. Builds the command
 * context, resolves visibility/enabled state, and delegates to the
 * palette overlay component. Once a command is selected, runs it
 * through the IO interface.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { PaletteOverlay } from "../components/palette-overlay";
import type { ResolvedPaletteConfig } from "../config";
import { createIO } from "../flows";
import type { CommandRegistry } from "../registry/create-registry";
import type { PaletteCommand, PaletteCommandContext } from "../registry/types";

export interface CommandView {
  command: PaletteCommand;
  enabled: boolean;
  disabledReason?: string;
  searchText: string;
  rankBoost: number;
}

export function buildCommandViews(
  registry: CommandRegistry,
  commandCtx: PaletteCommandContext,
): CommandView[] {
  const views: CommandView[] = [];

  for (const cmd of registry.commands) {
    const shown = cmd.isShown ? cmd.isShown(commandCtx) : true;
    if (!shown) continue;

    let enabled = true;
    let disabledReason: string | undefined;
    if (cmd.isEnabled) {
      const result = cmd.isEnabled(commandCtx);
      if (typeof result === "boolean") {
        enabled = result;
      } else {
        enabled = false;
        disabledReason = result.reason;
      }
    }

    const searchParts = [cmd.title];
    if (cmd.description) searchParts.push(cmd.description);
    if (cmd.aliases) searchParts.push(...cmd.aliases);
    if (cmd.keywords) searchParts.push(...cmd.keywords);
    if (cmd.getSearchText) searchParts.push(cmd.getSearchText(commandCtx));
    const searchText = searchParts.join(" ");

    const rankBoost = cmd.getRankBoost ? cmd.getRankBoost(commandCtx) : 0;

    views.push({
      command: cmd,
      enabled,
      disabledReason,
      searchText,
      rankBoost,
    });
  }

  return views;
}

export async function openPalette(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  registry: CommandRegistry,
  config: ResolvedPaletteConfig,
): Promise<void> {
  if (!ctx.hasUI) return;

  const commandCtx: PaletteCommandContext = { pi, ctx, config };
  const views = buildCommandViews(registry, commandCtx);

  const selected = await ctx.ui.custom<string | null>(
    (_tui, theme, _kb, done) => new PaletteOverlay(theme, views, done),
    {
      overlay: true,
      overlayOptions: {
        width: "70%",
        maxHeight: "60%",
        anchor: "center",
      },
    },
  );

  if (!selected) return;

  const cmd = registry.get(selected);
  if (!cmd) return;

  const io = createIO(ctx);
  await cmd.run(commandCtx, io);
}
