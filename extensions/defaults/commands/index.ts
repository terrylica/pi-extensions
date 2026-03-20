import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerEditorStashCommands } from "./editor-stash";
import { registerProjectInitCommand } from "./project-init";
import { registerDefaultsSettings } from "./settings";
import { registerThemeCommand } from "./theme";

export function registerCommands(pi: ExtensionAPI) {
  registerThemeCommand(pi);
  registerProjectInitCommand(pi);
  registerDefaultsSettings(pi);
  registerEditorStashCommands(pi);
}
