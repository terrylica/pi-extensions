import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerModeControls } from "./commands/mode-command";
import { configLoader } from "./config";
import {
  setupContextFilterHook,
  setupSessionSyncHooks,
  setupSystemPromptHook,
  setupToolGateHook,
} from "./hooks";
import { applyMode } from "./lib/mode-lifecycle";
import { registerModeSwitchRenderer } from "./lib/mode-switch";

export default async function (pi: ExtensionAPI): Promise<void> {
  await configLoader.load();
  pi.registerFlag("agent-mode", {
    description: "Starting modes extension mode",
    type: "string",
  });

  setupToolGateHook(pi);
  setupContextFilterHook(pi);
  setupSessionSyncHooks(pi);
  setupSystemPromptHook(pi);

  registerModeControls(pi, applyMode);
  registerModeSwitchRenderer(pi);
}
