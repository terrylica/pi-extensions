/**
 * Build a command registry from a list of PaletteCommand objects.
 *
 * Validates uniqueness of IDs and supports adding commands after creation
 * (for external commands registered via EventBus).
 */

import type { PaletteCommand } from "./types";

export interface CommandRegistry {
  /** All registered commands. */
  commands: PaletteCommand[];

  /** Lookup a command by ID. */
  get(id: string): PaletteCommand | undefined;

  /** Add a command. Silently skips duplicates. */
  add(cmd: PaletteCommand): void;
}

export function createRegistry(commands: PaletteCommand[]): CommandRegistry {
  const map = new Map<string, PaletteCommand>();
  const list: PaletteCommand[] = [];

  for (const cmd of commands) {
    if (map.has(cmd.id)) {
      throw new Error(`Duplicate palette command id: "${cmd.id}"`);
    }
    map.set(cmd.id, cmd);
    list.push(cmd);
  }

  return {
    commands: list,
    get: (id) => map.get(id),
    add(cmd) {
      if (map.has(cmd.id)) return;
      map.set(cmd.id, cmd);
      list.push(cmd);
    },
  };
}
