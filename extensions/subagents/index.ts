import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { registerSubagentsSettings } from "./commands/settings-command";
import {
  configLoader,
  isSubagentEnabled,
  SUBAGENT_NAMES,
  type SubagentName,
} from "./config";
import { createJesterTool, JESTER_GUIDANCE } from "./subagents/jester";
import { createLookoutTool, LOOKOUT_GUIDANCE } from "./subagents/lookout";
import { createOracleTool, ORACLE_GUIDANCE } from "./subagents/oracle";
import { createReviewerTool, REVIEWER_GUIDANCE } from "./subagents/reviewer";
import {
  createScoutTool,
  executeScout,
  SCOUT_GUIDANCE,
} from "./subagents/scout";
import { createWorkerTool, WORKER_GUIDANCE } from "./subagents/worker";

/**
 * Subagents Extension
 *
 * Provides specialized subagents with custom tools:
 * - scout: Web research and GitHub codebase exploration
 * - lookout: Local codebase search by functionality/concept (uses osgrep)
 * - oracle: Expert AI advisor for complex reasoning and planning
 * - reviewer: Code review feedback on diffs
 * - jester: Random data generator (no tools, high variance)
 * - worker: Focused implementation agent for well-defined tasks on specific files
 *
 */

/** Check required API keys, throw if missing */
function checkApiKeys(): string[] {
  const missing: string[] = [];

  if (!process.env.SCOUT_GITHUB_TOKEN) {
    missing.push("SCOUT_GITHUB_TOKEN");
  }

  return missing;
}

/**
 * Shared guidance for the `skills` parameter accepted by most subagent tools.
 * Merged once into the system prompt so every tool benefits without repetition.
 */
const SKILLS_GUIDANCE = `
## Passing skills to subagents

Most subagent tools (scout, lookout, oracle, reviewer, worker) accept an optional \`skills\` parameter.
When you pass skill names, the skill content is injected into the subagent's system prompt so it has domain-specific knowledge without needing to read files itself.

Use \`skills\` whenever the task involves a domain covered by an available skill. For example, when delegating iOS work to the worker, pass \`skills: ["ios-26"]\` instead of listing skill files in \`files\` or mentioning them in \`instructions\`.
`;

/** Mapping from subagent name to its guidance text. */
const GUIDANCE_BY_NAME: Record<SubagentName, string> = {
  scout: SCOUT_GUIDANCE,
  lookout: LOOKOUT_GUIDANCE,
  oracle: ORACLE_GUIDANCE,
  reviewer: REVIEWER_GUIDANCE,
  jester: JESTER_GUIDANCE,
  worker: WORKER_GUIDANCE,
};

export default async function (pi: ExtensionAPI) {
  // Load config
  await configLoader.load();

  // Don't hard-fail extension load on missing API keys.
  // This keeps no-external-deps tools (e.g. jester) easy to test.
  const missing = checkApiKeys();
  if (missing.length > 0) {
    console.warn(
      `subagents: missing env vars (${missing.join(", ")}). Some tools may fail when invoked.`,
    );
  }

  // Register settings command
  registerSubagentsSettings(pi);

  // Always register all tools so they can be toggled on/off dynamically.
  pi.registerTool(createScoutTool());
  pi.registerTool(createLookoutTool());
  pi.registerTool(createOracleTool());
  pi.registerTool(createReviewerTool());
  pi.registerTool(createJesterTool());
  pi.registerTool(createWorkerTool());

  // Listen for cross-extension scout calls (always registered)
  pi.events.on("scout:execute", (data: unknown) => {
    const payload = data as {
      input: { prompt: string; query?: string };
      resolve: (result: unknown) => void;
    };

    // Skip execution if scout is disabled
    if (!isSubagentEnabled("scout")) {
      payload.resolve(null);
      return;
    }

    const ctx: ExtensionContext = {
      ui: {} as never,
      hasUI: false,
      cwd: process.cwd(),
      sessionManager: {} as never,
      modelRegistry: {} as never,
      model: undefined,
      isIdle: () => true,
      abort: () => {},
      hasPendingMessages: () => false,
      shutdown: () => {},
      getContextUsage: () => undefined,
      compact: () => {},
      getSystemPrompt: () => "",
    };

    executeScout(payload.input, ctx)
      .then((result) => {
        const first = result.content[0];
        const text =
          first?.type === "text"
            ? (first as { type: "text"; text: string }).text
            : "";
        payload.resolve({ content: text });
      })
      .catch(() => {
        payload.resolve(null);
      });
  });

  // Before each agent turn: sync active tools and guidance with current config.
  pi.on("before_agent_start", async (event) => {
    // Determine which subagent tools should be disabled
    const disabledSubagents = new Set(
      SUBAGENT_NAMES.filter((name) => !isSubagentEnabled(name)),
    );

    // Filter active tools: remove disabled subagents, keep everything else
    const activeTools = pi
      .getActiveTools()
      .filter((tool) => !disabledSubagents.has(tool as SubagentName));
    pi.setActiveTools(activeTools);

    // Build guidance from enabled subagents only
    const guidances = SUBAGENT_NAMES.filter(
      (name) => !disabledSubagents.has(name),
    ).map((name) => GUIDANCE_BY_NAME[name]);
    guidances.push(SKILLS_GUIDANCE);

    return {
      systemPrompt: `${event.systemPrompt}\n${guidances.join("\n")}`,
    };
  });
}
