import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupEditPlanCommand } from "./edit-plan";
import { setupExecutePlanCommand } from "./execute-plan";
import { setupSaveAsPlanCommand } from "./save-as-plan";

export function setupPlanningCommands(pi: ExtensionAPI) {
  setupEditPlanCommand(pi);
  setupExecutePlanCommand(pi);
  setupSaveAsPlanCommand(pi);
}
