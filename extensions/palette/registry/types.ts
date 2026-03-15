/**
 * Core types for the command palette registry.
 *
 * Every palette command implements the PaletteCommand interface.
 * Commands are self-contained: metadata for discovery, guards for
 * visibility, and a run() method that drives execution through a
 * generic IO interface.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { SizeValue } from "@mariozechner/pi-tui";
import type { ResolvedPaletteConfig } from "../config";

// ---------------------------------------------------------------------------
// Context passed to every command hook
// ---------------------------------------------------------------------------

export interface PaletteCommandContext {
  pi: ExtensionAPI;
  ctx: ExtensionContext;
  config: ResolvedPaletteConfig;
}

// ---------------------------------------------------------------------------
// IO -- the abstraction commands use to interact with the user
// ---------------------------------------------------------------------------

export interface PickItem {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
}

export interface PickOptions {
  title: string;
  emptyText?: string;
  items: PickItem[];
  initialQuery?: string;
  width?: SizeValue;
  maxHeight?: SizeValue;
}

export interface PickResult {
  value: string;
  query: string;
}

export interface InputOptions {
  title: string;
  placeholder?: string;
  initialValue?: string;
  width?: SizeValue;
  maxHeight?: SizeValue;
}

export interface CommandIO {
  pick(options: PickOptions): Promise<PickResult | null>;
  input(options: InputOptions): Promise<string | null>;
  notify(message: string, level?: "info" | "warning" | "error"): void;
}

// ---------------------------------------------------------------------------
// Command groups -- used for visual grouping in the palette UI
// ---------------------------------------------------------------------------

export type CommandGroup =
  | "session"
  | "model"
  | "shell"
  | "files"
  | "clipboard"
  | "context"
  | "appearance";

// ---------------------------------------------------------------------------
// The command interface
// ---------------------------------------------------------------------------

export interface PaletteCommand {
  /** Unique identifier, e.g. "compact" or "model.select". */
  id: string;

  /** Display title shown in the palette list. */
  title: string;

  /** Short description shown next to the title. */
  description?: string;

  /** Alternative search terms. */
  aliases?: string[];

  /** Extra search keywords (not displayed). */
  keywords?: string[];

  /** Human-readable shortcut hint, e.g. "Ctrl+S". Not functional, display only. */
  shortcutLabel?: string;

  /** Visual grouping. */
  group?: CommandGroup;

  /**
   * Whether this command should appear in the palette.
   * Defaults to true when omitted.
   */
  isShown?(c: PaletteCommandContext): boolean;

  /**
   * Whether this command can be executed right now.
   * Return false or { enabled: false, reason } to grey it out.
   * Defaults to true when omitted.
   */
  isEnabled?(
    c: PaletteCommandContext,
  ): boolean | { enabled: false; reason?: string };

  /**
   * Extra text appended to the search corpus for this command
   * based on current context (e.g. current model name).
   */
  getSearchText?(c: PaletteCommandContext): string;

  /**
   * Numeric boost added to the fuzzy score. Higher values float
   * the command toward the top. Use sparingly.
   */
  getRankBoost?(c: PaletteCommandContext): number;

  /**
   * The execution entrypoint. Receives the command context and a
   * IO interface for user interaction (pickers, inputs, notifications).
   */
  run(c: PaletteCommandContext, io: CommandIO): Promise<void>;
}
