/**
 * Central command list. Every palette command is imported here and
 * returned as a flat array. The registry validates uniqueness at startup.
 */

import type { PaletteCommand } from "../registry/types";
import { compactCommand } from "./compact";
import { copyLastAssistantCommand } from "./copy-last-assistant";
import {
  shellWithContextCommand,
  shellWithoutContextCommand,
} from "./run-shell";
import { selectModelCommand } from "./select-model";
import { setSessionNameCommand } from "./set-session-name";

export function getPaletteCommands(): PaletteCommand[] {
  return [
    compactCommand,
    selectModelCommand,
    setSessionNameCommand,
    copyLastAssistantCommand,
    shellWithContextCommand,
    shellWithoutContextCommand,
  ];
}
