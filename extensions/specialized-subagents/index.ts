import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createScoutTool, SCOUT_GUIDANCE } from "./subagents/scout";

/**
 * Specialized Subagents Extension
 *
 * Provides specialized subagents with custom tools:
 * - scout: Web research and URL fetching (Exa + GitHub APIs)
 */

// Collect all subagent guidances
const SUBAGENT_GUIDANCES = [SCOUT_GUIDANCE];

export default function (pi: ExtensionAPI) {
  // Register tools
  pi.registerTool(createScoutTool());

  // Inject subagent guidance into system prompt
  pi.on("before_agent_start", async (event) => {
    const guidance = SUBAGENT_GUIDANCES.join("\n");
    return {
      systemPrompt: `${event.systemPrompt}\n${guidance}`,
    };
  });
}
