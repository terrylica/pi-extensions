/**
 * Worker subagent - focused implementation agent for well-defined tasks.
 *
 * Sandboxed to specific files. Reads, edits, writes, and runs bash for
 * verification. Does not search or explore the codebase.
 */

import type {
  AgentToolResult,
  AgentToolUpdateCallback,
  ExtensionContext,
  Skill,
  ToolDefinition,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import {
  createBashTool,
  createEditTool,
  type createReadOnlyTools,
  createReadTool,
  createWriteTool,
  getMarkdownTheme,
  type Theme,
} from "@mariozechner/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { SubagentFooter } from "../../components";
import { executeSubagent, resolveModel, resolveSkillsByName } from "../../lib";
import type { SubagentToolCall } from "../../lib/types";
import { getSpinnerFrame, INDICATOR } from "../../lib/ui/spinner";
import { formatSubagentStats, pluralize } from "../../lib/ui/stats";
import { MODEL } from "./config";
import { WORKER_SYSTEM_PROMPT } from "./system-prompt";
import { formatWorkerToolCall } from "./tool-formatter";
import type { WorkerDetails, WorkerInput } from "./types";

/** System prompt guidance for worker tool usage */
export const WORKER_GUIDANCE = `
## Worker

Delegate implementation work to the worker instead of doing it yourself when the task is well-defined and the files are known. The worker is a focused implementation agent: it reads, edits, writes files and runs verification commands. It is sandboxed to the files you provide.

**You SHOULD delegate to the worker when:**
- You already know which files need to change and what the change is
- The task is implementation, not exploration or planning
- Examples: migrating files to TypeScript, adding documentation, adding error handling, applying a refactoring pattern, fixing a known bug in specific files

**You should NOT delegate to the worker when:**
- You need to explore or search the codebase first (use lookout or scout)
- The scope is unclear or you don't know which files are involved
- The task is architectural planning (use oracle)

**Inputs:**
- \`task\`: Short description (~50 chars, for display only, not sent to the worker)
- \`instructions\`: Full instructions for the worker (be specific and complete)
- \`files\`: Array of file paths the worker should operate on
- \`context\`: Optional background info (e.g., patterns to follow, constraints)
- \`skills\`: Optional skill names for specialized context

**After the worker completes:** Review its output yourself. If the worker did not run verification (e.g., typecheck, tests, lint), do it yourself and fix any issues.

**Example:**
\`\`\`json
{
  "task": "Convert helpers.js to TypeScript",
  "instructions": "Convert this file from JavaScript to TypeScript. Add proper type annotations for all function parameters and return types. Use generics where appropriate.",
  "files": ["src/utils/helpers.js"],
  "context": "Follow the typing patterns used in src/utils/types.ts"
}
\`\`\`
`;

const parameters = Type.Object({
  task: Type.String({
    description:
      "Short description of the task (~50 chars, for display only, not sent to the worker)",
  }),
  instructions: Type.String({
    description: "Full instructions for the worker (be specific and complete)",
  }),
  files: Type.Array(Type.String(), {
    description: "Files the worker should operate on",
  }),
  context: Type.Optional(
    Type.String({
      description:
        "Optional background info (e.g., patterns to follow, constraints)",
    }),
  ),
  skills: Type.Optional(
    Type.Array(Type.String(), {
      description:
        "Skill names to provide specialized context (e.g., 'ios-26', 'drizzle-orm')",
    }),
  ),
});

/** Build the user message for the subagent based on inputs */
function buildUserMessage(input: WorkerInput): string {
  const parts: string[] = [];

  parts.push(`## Instructions\n${input.instructions}`);
  parts.push(`## Files\n${input.files.map((f) => `- ${f}`).join("\n")}`);

  if (input.context) {
    parts.push(`## Context\n${input.context}`);
  }

  return parts.join("\n\n");
}

/** Create the worker tool definition for use in extensions */
export function createWorkerTool(): ToolDefinition<
  typeof parameters,
  WorkerDetails
> {
  return {
    name: "worker",
    label: "Worker",
    description: `Focused implementation agent for well-defined tasks on specific files.

The worker reads, edits, writes files and runs bash for verification. It is sandboxed to the files you provide. It does not search or explore the codebase.

Use for: file migrations, adding docs/types, applying refactoring patterns, adding error handling, fixing known bugs in specific files.

Pass relevant skills (e.g., 'ios-26', 'drizzle-orm') to provide specialized context for the task.`,

    parameters,

    async execute(
      _toolCallId: string,
      args: WorkerInput,
      onUpdate: AgentToolUpdateCallback<WorkerDetails> | undefined,
      ctx: ExtensionContext,
      signal?: AbortSignal,
    ) {
      const { task, instructions, files, context, skills: skillNames } = args;

      // Resolve skills if provided
      let resolvedSkills: Skill[] = [];
      let notFoundSkills: string[] = [];

      if (skillNames && skillNames.length > 0) {
        const result = resolveSkillsByName(skillNames, ctx.cwd);
        resolvedSkills = result.skills;
        notFoundSkills = result.notFound;
      }

      // Validate: instructions and files are required
      if (!instructions) {
        const error = "Instructions are required.";
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          details: {
            task,
            instructions: "",
            files,
            context,
            skills: skillNames,
            skillsResolved: resolvedSkills.length,
            skillsNotFound:
              notFoundSkills.length > 0 ? notFoundSkills : undefined,
            toolCalls: [],
            spinnerFrame: 0,
            error,
          },
        };
      }

      if (!files || files.length === 0) {
        const error = "At least one file is required.";
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          details: {
            task,
            instructions,
            files: [],
            context,
            skills: skillNames,
            skillsResolved: resolvedSkills.length,
            skillsNotFound:
              notFoundSkills.length > 0 ? notFoundSkills : undefined,
            toolCalls: [],
            spinnerFrame: 0,
            error,
          },
        };
      }

      let resolvedModel: { provider: string; id: string } | undefined;

      let currentToolCalls: SubagentToolCall[] = [];
      let spinnerFrame = 0;

      // Set up spinner animation interval
      const spinnerInterval = setInterval(() => {
        spinnerFrame++;
        if (currentToolCalls.some((tc) => tc.status === "running")) {
          onUpdate?.({
            content: [{ type: "text", text: "" }],
            details: {
              task,
              instructions,
              files,
              context,
              skills: skillNames,
              skillsResolved: resolvedSkills.length,
              skillsNotFound:
                notFoundSkills.length > 0 ? notFoundSkills : undefined,
              toolCalls: currentToolCalls,
              spinnerFrame,
              resolvedModel,
            },
          });
        }
      }, 80);

      try {
        const model = resolveModel(MODEL, ctx);
        resolvedModel = { provider: model.provider, id: model.id };

        // Publish resolved provider/model as early as possible
        onUpdate?.({
          content: [{ type: "text", text: "" }],
          details: {
            task,
            instructions,
            files,
            context,
            skills: skillNames,
            skillsResolved: resolvedSkills.length,
            skillsNotFound:
              notFoundSkills.length > 0 ? notFoundSkills : undefined,
            toolCalls: currentToolCalls,
            spinnerFrame,
            resolvedModel,
          },
        });

        let userMessage = buildUserMessage(args);

        // Append warning if skills not found
        if (notFoundSkills.length > 0) {
          userMessage += `\n\n**Note:** The following skills were not found and could not be loaded: ${notFoundSkills.join(", ")}`;
        }

        // Sandboxed tools: read, edit, write, bash. No grep/find/ls.
        type BuiltinTool = ReturnType<typeof createReadOnlyTools>[number];
        const tools: BuiltinTool[] = [
          createReadTool(ctx.cwd) as BuiltinTool,
          createEditTool(ctx.cwd) as BuiltinTool,
          createWriteTool(ctx.cwd) as BuiltinTool,
          createBashTool(ctx.cwd) as BuiltinTool,
        ];

        const result = await executeSubagent(
          {
            name: "worker",
            model,
            systemPrompt: WORKER_SYSTEM_PROMPT,
            skills: resolvedSkills,
            tools,
            customTools: [],
            thinkingLevel: "low",
            logging: {
              enabled: true,
              debug: true,
            },
          },
          userMessage,
          ctx,
          // onTextUpdate
          (_delta, accumulated) => {
            onUpdate?.({
              content: [{ type: "text", text: accumulated }],
              details: {
                task,
                instructions,
                files,
                context,
                skills: skillNames,
                skillsResolved: resolvedSkills.length,
                skillsNotFound:
                  notFoundSkills.length > 0 ? notFoundSkills : undefined,
                toolCalls: currentToolCalls,
                spinnerFrame,
                response: accumulated,
                resolvedModel,
              },
            });
          },
          signal,
          // onToolUpdate
          (toolCalls: SubagentToolCall[]) => {
            currentToolCalls = toolCalls;
            onUpdate?.({
              content: [{ type: "text", text: "" }],
              details: {
                task,
                instructions,
                files,
                context,
                skills: skillNames,
                skillsResolved: resolvedSkills.length,
                skillsNotFound:
                  notFoundSkills.length > 0 ? notFoundSkills : undefined,
                toolCalls: currentToolCalls,
                spinnerFrame,
                resolvedModel,
              },
            });
          },
        );

        const finalToolCalls =
          result.toolCalls.length > 0 ? result.toolCalls : currentToolCalls;

        if (result.aborted) {
          return {
            content: [{ type: "text" as const, text: "Aborted" }],
            details: {
              task,
              instructions,
              files,
              context,
              skills: skillNames,
              skillsResolved: resolvedSkills.length,
              skillsNotFound:
                notFoundSkills.length > 0 ? notFoundSkills : undefined,
              toolCalls: finalToolCalls,
              spinnerFrame,
              aborted: true,
              usage: result.usage,
              resolvedModel,
            },
          };
        }

        if (result.error) {
          return {
            content: [
              { type: "text" as const, text: `Error: ${result.error}` },
            ],
            details: {
              task,
              instructions,
              files,
              context,
              skills: skillNames,
              skillsResolved: resolvedSkills.length,
              skillsNotFound:
                notFoundSkills.length > 0 ? notFoundSkills : undefined,
              toolCalls: finalToolCalls,
              spinnerFrame,
              error: result.error,
              usage: result.usage,
              resolvedModel,
            },
          };
        }

        // Check if all tool calls failed
        const errorCount = finalToolCalls.filter(
          (tc) => tc.status === "error",
        ).length;
        const allFailed =
          finalToolCalls.length > 0 && errorCount === finalToolCalls.length;

        if (allFailed) {
          const error = "All tool calls failed";
          return {
            content: [{ type: "text" as const, text: `Error: ${error}` }],
            details: {
              task,
              instructions,
              files,
              context,
              skills: skillNames,
              skillsResolved: resolvedSkills.length,
              skillsNotFound:
                notFoundSkills.length > 0 ? notFoundSkills : undefined,
              toolCalls: finalToolCalls,
              spinnerFrame,
              error,
              usage: result.usage,
              resolvedModel,
            },
          };
        }

        return {
          content: [{ type: "text" as const, text: result.content }],
          details: {
            task,
            instructions,
            files,
            context,
            skills: skillNames,
            skillsResolved: resolvedSkills.length,
            skillsNotFound:
              notFoundSkills.length > 0 ? notFoundSkills : undefined,
            toolCalls: finalToolCalls,
            spinnerFrame,
            response: result.content,
            usage: result.usage,
            resolvedModel,
          },
        };
      } finally {
        clearInterval(spinnerInterval);
      }
    },

    renderCall(args, theme) {
      const container = new Container();

      container.addChild(
        new Text(theme.fg("toolTitle", theme.bold("Worker")), 0, 0),
      );

      // Task label
      container.addChild(
        new Text(`  ${theme.fg("muted", "Task: ")}${args.task}`, 0, 0),
      );

      // Show skills if provided
      if (args.skills && args.skills.length > 0) {
        container.addChild(
          new Text(
            `  ${theme.fg("muted", "Skills: ")}${args.skills.join(", ")}`,
            0,
            0,
          ),
        );
      }

      return container;
    },

    renderResult(
      result: AgentToolResult<WorkerDetails>,
      options: ToolRenderResultOptions,
      theme: Theme,
    ) {
      const { details } = result;
      const { expanded, isPartial } = options;

      // Fallback if details missing
      if (!details) {
        const text = result.content[0];
        const content = text?.type === "text" ? text.text : "";
        if (content) {
          try {
            const mdTheme = getMarkdownTheme();
            return new Markdown(content, 0, 0, mdTheme);
          } catch {
            return new Text(content, 0, 0);
          }
        }
        return new Text("", 0, 0);
      }

      const {
        toolCalls,
        spinnerFrame,
        response,
        aborted,
        error,
        usage,
        resolvedModel,
      } = details;

      // Counts
      const doneCount = toolCalls.filter((tc) => tc.status === "done").length;
      const runningCount = toolCalls.filter(
        (tc) => tc.status === "running",
      ).length;
      const errorCount = toolCalls.filter((tc) => tc.status === "error").length;

      const footer = new SubagentFooter(theme, {
        resolvedModel,
        usage,
        toolCalls,
      });

      const instructionsLine = new Text(
        `${theme.fg("muted", "Instructions: ")}${details.instructions}`,
        0,
        0,
      );

      // Aborted state
      if (aborted) {
        const container = new Container();
        container.addChild(instructionsLine);
        const suffix =
          doneCount > 0
            ? ` (${doneCount} ${pluralize(doneCount, "tool call")} completed)`
            : "";
        container.addChild(
          new Text(
            theme.fg("warning", "Aborted") + theme.fg("muted", suffix),
            0,
            0,
          ),
        );
        container.addChild(footer);
        return container;
      }

      // Error state
      if (error) {
        const container = new Container();
        container.addChild(instructionsLine);
        container.addChild(
          new Text(theme.fg("error", `Error: ${error}`), 0, 0),
        );
        container.addChild(footer);
        return container;
      }

      // Running + collapsed: show current tool + footer
      if (isPartial && !expanded) {
        const container = new Container();
        container.addChild(instructionsLine);

        const currentTool = toolCalls.find((tc) => tc.status === "running");
        if (currentTool) {
          const spinner = getSpinnerFrame(spinnerFrame);
          const partialText = currentTool.partialResult?.content?.[0];

          if (partialText?.type === "text" && partialText.text) {
            container.addChild(
              new Text(`${spinner} ${partialText.text}`, 0, 0),
            );
          } else {
            const { label, detail } = formatWorkerToolCall(currentTool);
            const text = detail ? `${label} ${detail}` : label;
            container.addChild(new Text(`${spinner} ${text}`, 0, 0));
          }
        } else {
          container.addChild(
            new Text(
              theme.fg("muted", `${getSpinnerFrame(spinnerFrame)} working...`),
              0,
              0,
            ),
          );
        }

        container.addChild(new Spacer(1));
        container.addChild(footer);
        return container;
      }

      // Running + expanded: show all tool calls
      if (isPartial) {
        const container = new Container();
        container.addChild(instructionsLine);

        const statusText =
          runningCount > 0
            ? `${doneCount} done, ${runningCount} running`
            : "Working...";
        container.addChild(new Text(theme.fg("muted", statusText), 0, 0));

        if (toolCalls.length > 0) {
          for (const tc of toolCalls) {
            const indicator =
              tc.status === "running"
                ? getSpinnerFrame(spinnerFrame)
                : tc.status === "done"
                  ? INDICATOR.done
                  : INDICATOR.error;

            const indicatorColored =
              tc.status === "done"
                ? theme.fg("success", indicator)
                : tc.status === "error"
                  ? theme.fg("error", indicator)
                  : indicator;

            let text: string;
            const partialText = tc.partialResult?.content?.[0];
            if (
              tc.status === "running" &&
              partialText?.type === "text" &&
              partialText.text
            ) {
              text = partialText.text;
            } else {
              const { label, detail } = formatWorkerToolCall(tc);
              text = detail
                ? `${theme.bold(label)} ${detail}`
                : theme.bold(label);
            }
            container.addChild(new Text(`${indicatorColored} ${text}`, 0, 0));
          }
        }

        container.addChild(new Spacer(1));
        container.addChild(footer);
        return container;
      }

      // Done + collapsed
      if (!expanded) {
        const container = new Container();
        container.addChild(instructionsLine);

        const allFailed =
          toolCalls.length > 0 && errorCount === toolCalls.length;
        const stats = formatSubagentStats(
          usage ?? { estimatedTokens: Math.round((response?.length ?? 0) / 4) },
          toolCalls.length,
        );
        const indicator = allFailed ? INDICATOR.error : INDICATOR.done;
        const indicatorColor = allFailed ? "error" : "success";

        container.addChild(
          new Text(
            theme.fg(indicatorColor, `${indicator} `) +
              theme.fg("muted", stats),
            0,
            0,
          ),
        );
        container.addChild(footer);
        return container;
      }

      // Done + expanded
      const container = new Container();
      container.addChild(instructionsLine);

      // Stats line
      const allFailed = toolCalls.length > 0 && errorCount === toolCalls.length;
      const stats = formatSubagentStats(
        usage ?? { estimatedTokens: Math.round((response?.length ?? 0) / 4) },
        toolCalls.length,
      );
      const indicator = allFailed ? INDICATOR.error : INDICATOR.done;
      const indicatorColor = allFailed ? "error" : "success";
      container.addChild(
        new Text(
          theme.fg(indicatorColor, `${indicator} `) + theme.fg("muted", stats),
          0,
          0,
        ),
      );

      // Files list
      if (details.files.length > 0) {
        container.addChild(new Spacer(1));
        container.addChild(new Text(theme.fg("muted", "Files:"), 0, 0));
        for (const f of details.files) {
          container.addChild(new Text(`  ${f}`, 0, 0));
        }
      }

      // All tool calls with status indicators
      if (toolCalls.length > 0) {
        container.addChild(new Spacer(1));
        const tcHeader = theme.fg("muted", `Tool calls (${toolCalls.length}):`);
        container.addChild(new Text(tcHeader, 0, 0));

        for (const tc of toolCalls) {
          const tcIndicator =
            tc.status === "done"
              ? theme.fg("success", INDICATOR.done)
              : theme.fg("error", INDICATOR.error);
          const { label, detail } = formatWorkerToolCall(tc);
          const text = detail
            ? `${theme.bold(label)} ${detail}`
            : theme.bold(label);
          container.addChild(new Text(`  ${tcIndicator} ${text}`, 0, 0));
        }
      }

      // Response as markdown
      if (response) {
        container.addChild(new Spacer(1));
        container.addChild(new Text(theme.fg("muted", "───"), 0, 0));
        container.addChild(new Spacer(1));

        try {
          const mdTheme = getMarkdownTheme();
          container.addChild(new Markdown(response, 0, 0, mdTheme));
        } catch {
          container.addChild(new Text(response, 0, 0));
        }

        container.addChild(new Spacer(1));
      }

      container.addChild(footer);
      return container;
    },
  };
}

/** Execute the worker subagent directly (without tool wrapper) */
export async function executeWorker(
  input: WorkerInput,
  ctx: ExtensionContext,
  onUpdate?: AgentToolUpdateCallback<WorkerDetails>,
  signal?: AbortSignal,
): Promise<AgentToolResult<WorkerDetails>> {
  const tool = createWorkerTool();
  return tool.execute("direct", input, onUpdate, ctx, signal);
}
