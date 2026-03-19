/**
 * Main entrypoint for opening the palette overlay. The palette stays
 * open as a single persistent overlay. When a command is selected,
 * it runs within the palette shell -- io.pick() and io.input() push
 * views onto the palette's internal stack instead of opening new
 * overlays. Esc in a sub-view pops back; Esc at the root closes
 * the palette.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { PaletteOverlay } from "../components/palette-overlay";
import type { ResolvedPaletteConfig } from "../config";
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

  // Sort by group order, preserving original order within each group.
  const groupOrder: Record<string, number> = {
    appearance: 0,
    model: 1,
    session: 2,
    clipboard: 3,
    shell: 4,
    context: 5,
    files: 6,
  };
  views.sort((a, b) => {
    const ga = groupOrder[a.command.group ?? ""] ?? 99;
    const gb = groupOrder[b.command.group ?? ""] ?? 99;
    return ga - gb;
  });

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

  await ctx.ui.custom<void>(
    (tui, theme, _kb, done) => {
      const palette = new PaletteOverlay(
        theme,
        views,
        async (commandId: string) => {
          if (palette.isCommandRunning) return;

          const cmd = registry.get(commandId);
          if (!cmd) return;

          const io = palette.createIO((msg, level) =>
            ctx.ui.notify(msg, level),
          );
          palette.running = true;
          tui.requestRender();

          try {
            await cmd.run(commandCtx, io);
          } finally {
            palette.running = false;
            palette.popToRoot();
            tui.requestRender();
          }

          // Close the palette after the command completes successfully
          done();
        },
        () => done(),
        () => tui.requestRender(),
      );

      return palette;
    },
    {
      overlay: true,
      overlayOptions: {
        width: "70%",
        maxHeight: "60%",
        anchor: "center",
        margin: { top: 2, bottom: 15 },
      },
    },
  );
}
