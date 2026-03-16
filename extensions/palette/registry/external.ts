/**
 * Types and adapter for external palette commands registered via EventBus.
 *
 * External extensions emit "ad:palette:register" events with an
 * ExternalPaletteCommand payload. The palette wraps these into
 * PaletteCommand objects that collect input via io.input() before
 * calling the external execute function.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { AD_PALETTE_REGISTER_EVENT } from "../../../packages/events";
import type { CommandGroup, PaletteCommand } from "./types";

/**
 * Input declaration for an external command. The palette collects
 * this via its IO system before calling execute.
 */
export interface ExternalCommandInput {
  type: "text";
  title: string;
  placeholder?: string;
  /** If true, the user can submit without entering a value. */
  optional?: boolean;
}

/**
 * The shape emitted by other extensions via pi.events.emit("ad:palette:register", payload).
 */
export interface ExternalPaletteCommand {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  group?: CommandGroup;

  /** Declarative input -- palette collects this before calling execute. */
  input?: ExternalCommandInput;

  /** Optional enablement guard, same semantics as PaletteCommand.isEnabled(). */
  isEnabled?: PaletteCommand["isEnabled"];

  /** Receives the active extension context and collected input value. */
  execute: (ctx: ExtensionContext, input?: string) => Promise<void>;
}

/** Event name for external command registration. */
export const PALETTE_REGISTER_EVENT = AD_PALETTE_REGISTER_EVENT;

/**
 * Wrap an ExternalPaletteCommand into a PaletteCommand that the
 * registry can use directly.
 */
export function wrapExternalCommand(
  ext: ExternalPaletteCommand,
): PaletteCommand {
  return {
    id: ext.id,
    title: ext.title,
    description: ext.description,
    keywords: ext.keywords,
    group: ext.group,
    isEnabled: ext.isEnabled,

    async run(c, io) {
      if (!ext.input) {
        await ext.execute(c.ctx);
        return;
      }

      const value = await io.input({
        title: ext.input.title,
        placeholder: ext.input.placeholder,
      });

      if (value === null) {
        if (!ext.input.optional) return;
        await ext.execute(c.ctx, "");
        return;
      }

      if (!value.trim() && !ext.input.optional) return;

      await ext.execute(c.ctx, value.trim());
    },
  };
}
