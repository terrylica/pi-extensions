/**
 * Planning Extension
 *
 * Commands for creating and executing implementation plans.
 *
 * Commands:
 * - /save-as-plan [instructions] - Create plan from conversation
 * - /execute-plan - Select and execute a plan
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupPlanningCommands } from "./commands";

export default function (pi: ExtensionAPI) {
  setupPlanningCommands(pi);
}
