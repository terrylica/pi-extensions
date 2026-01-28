/**
 * Edit Plan Command
 *
 * Selects an existing plan and opens it in the editor for updates.
 *
 * Usage:
 *   /plan:edit
 */

import { spawnSync } from "node:child_process";

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { selectPlan } from "../lib/plan-selector";
import { listPlans } from "../lib/plan-utils";

export function setupEditPlanCommand(pi: ExtensionAPI) {
  pi.registerCommand("plan:edit", {
    description: "Select and edit a saved plan in $VISUAL/$EDITOR",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("plan:edit requires interactive mode", "error");
        return;
      }

      await ctx.waitForIdle();
      const cwd = process.cwd();
      const plans = await listPlans(cwd);

      if (plans.length === 0) {
        ctx.ui.notify("No plans found in .agents/plans/", "warning");
        return;
      }

      const plan = await selectPlan(ctx, plans, "Select a plan to edit");

      if (!plan) {
        return;
      }

      const editor = process.env.VISUAL || process.env.EDITOR;

      if (!editor) {
        ctx.ui.notify("Set $VISUAL or $EDITOR to use plan:edit", "error");
        return;
      }

      const exitCode = await ctx.ui.custom<number | null>(
        (tui, _theme, _kb, done) => {
          tui.stop();

          const [editorBin, ...editorArgs] = editor.split(" ");
          const result = spawnSync(
            editorBin ?? editor,
            [...editorArgs, plan.path],
            {
              stdio: "inherit",
              env: process.env,
            },
          );

          tui.start();
          tui.requestRender(true);

          done(result.status);

          return { render: () => [], invalidate: () => {} };
        },
      );

      if (exitCode !== 0) {
        ctx.ui.notify("Editor exited with errors", "error");
        return;
      }

      ctx.ui.notify(`Closed editor for ${plan.filename}`, "info");
    },
  });
}
