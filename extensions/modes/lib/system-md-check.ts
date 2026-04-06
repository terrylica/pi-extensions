import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { PROMPT_FAMILY_MARKER } from "./prompt-families";

export function setupAppendSystemMdCheck(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    const agentDir = getAgentDir();
    const appendSystemMdPath = join(agentDir, "APPEND_SYSTEM.md");

    if (existsSync(appendSystemMdPath)) {
      const content = readFileSync(appendSystemMdPath, "utf-8");
      if (content.includes(PROMPT_FAMILY_MARKER)) return;
    }

    ctx.ui.notify(
      "APPEND_SYSTEM.md is missing or invalid. Prompt family switching requires it.",
      "warning",
    );

    const confirmed = await ctx.ui.confirm(
      "Create APPEND_SYSTEM.md?",
      `This will write the prompt family marker to ${appendSystemMdPath}.\nWithout it, pi's default system prompt is used and family switching is disabled.`,
    );

    if (!confirmed) return;

    try {
      writeFileSync(appendSystemMdPath, `${PROMPT_FAMILY_MARKER}\n`, "utf-8");
      ctx.ui.notify(
        "Created APPEND_SYSTEM.md with prompt family marker.",
        "info",
      );
    } catch (err) {
      ctx.ui.notify(
        `Failed to write APPEND_SYSTEM.md: ${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
    }
  });
}
