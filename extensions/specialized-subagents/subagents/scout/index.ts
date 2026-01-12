/**
 * Scout subagent - web research and URL fetching.
 *
 * Takes a URL and/or query, optionally with a prompt, and returns
 * either raw content or a detailed answer based on fetched information.
 */

import type {
  AgentToolResult,
  AgentToolUpdateCallback,
  ExtensionContext,
  ToolDefinition,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme, type Theme } from "@mariozechner/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { executeSubagent } from "../../lib/executor";
import type { SubagentToolCall } from "../../lib/types";
import { getSpinnerFrame, INDICATOR } from "../../lib/ui/spinner";
import { formatSubagentStats, pluralize } from "../../lib/ui/stats";
import { MODEL } from "./config";
import { SCOUT_SYSTEM_PROMPT } from "./system-prompt";
import { formatScoutToolCall } from "./tool-formatter";
import { createScoutTools } from "./tools";
import type { ScoutDetails, ScoutInput } from "./types";

/** System prompt guidance for scout tool usage */
export const SCOUT_GUIDANCE = `
## Scout

Use scout for web research and URL fetching. It can fetch URLs, search the web, and access GitHub content.

**When to use:**
- Fetching content from URLs (articles, documentation, webpages)
- Searching the web for information
- Fetching GitHub repos, files, issues, or pull requests

**When NOT to use:**
- Testing API endpoints (use curl instead)
- Making POST/PUT/DELETE requests
- Downloading binary files

**Inputs (at least one of url or query required):**
- \`url\`: Specific URL to fetch (GitHub URLs auto-detected for better formatting)
- \`query\`: Search query for online research
- \`prompt\`: Question to answer based on fetched content (omit for raw content)

**Examples:**
- Fetch a URL: \`{ url: "https://example.com/docs" }\`
- Search the web: \`{ query: "typescript best practices 2025" }\`
- Fetch + analyze: \`{ url: "...", prompt: "summarize the key points" }\`
- Research + answer: \`{ query: "react server components", prompt: "explain the benefits" }\`
- GitHub issue: \`{ url: "https://github.com/owner/repo/issues/123" }\`

**Important:** Prefer scout over \`curl\` when retrieving web content. Use \`curl\` only for testing endpoints or making API requests that require specific headers/methods.
`;

const parameters = Type.Object({
  url: Type.Optional(
    Type.String({
      description: "Specific URL to fetch content from",
    }),
  ),
  query: Type.Optional(
    Type.String({
      description: "Search query for online research",
    }),
  ),
  prompt: Type.Optional(
    Type.String({
      description:
        "What to analyze or answer based on the fetched content. If not provided, returns raw content.",
    }),
  ),
});

/** Build the user message for the subagent based on inputs */
function buildUserMessage(input: ScoutInput): string {
  const parts: string[] = [];

  if (input.url) {
    parts.push(`URL to fetch: ${input.url}`);
  }

  if (input.query) {
    parts.push(`Search query: ${input.query}`);
  }

  if (input.prompt) {
    parts.push(`\nQuestion/Task: ${input.prompt}`);
  } else {
    parts.push(
      "\nReturn the fetched content as markdown. Do not add any analysis.",
    );
  }

  return parts.join("\n");
}

/** Resolve model from context registry */
function resolveModel(ctx: ExtensionContext) {
  const model = ctx.modelRegistry.find(MODEL.provider, MODEL.model);
  if (!model) {
    throw new Error(
      `Model ${MODEL.provider}/${MODEL.model} not found. Check that the model ID is correct.`,
    );
  }
  return model;
}

/** Create the scout tool definition for use in extensions */
export function createScoutTool(): ToolDefinition<
  typeof parameters,
  ScoutDetails
> {
  return {
    name: "scout",
    label: "Scout",
    description: `Web research assistant that fetches URLs and/or searches the web.

Inputs (at least one of url or query required):
- url: Specific URL to fetch (supports GitHub URLs including issues/PRs)
- query: Search query for online research  
- prompt: Question to answer based on fetched content (if omitted, returns raw content)

Use cases:
- Fetch a URL: { url: "https://..." }
- Search the web: { query: "how to..." }
- Fetch + search: { url: "...", query: "..." }
- Fetch + analyze: { url: "...", prompt: "summarize this" }
- Research + answer: { query: "...", prompt: "what is the best..." }`,

    parameters,

    async execute(
      _toolCallId: string,
      args: ScoutInput,
      onUpdate: AgentToolUpdateCallback<ScoutDetails> | undefined,
      ctx: ExtensionContext,
      signal?: AbortSignal,
    ) {
      const { url, query, prompt } = args;

      // Validate: at least one of url or query required
      if (!url && !query) {
        const error = "At least one of 'url' or 'query' is required.";
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          details: {
            url,
            query,
            prompt,
            toolCalls: [],
            spinnerFrame: 0,
            error,
          },
        };
      }

      let currentToolCalls: SubagentToolCall[] = [];
      let spinnerFrame = 0;

      // Set up spinner animation interval
      const spinnerInterval = setInterval(() => {
        spinnerFrame++;
        // Only update if we have running tool calls
        if (currentToolCalls.some((tc) => tc.status === "running")) {
          onUpdate?.({
            content: [{ type: "text", text: "" }],
            details: {
              url,
              query,
              prompt,
              toolCalls: currentToolCalls,
              spinnerFrame,
            },
          });
        }
      }, 80);

      try {
        const model = resolveModel(ctx);
        const userMessage = buildUserMessage(args);

        const result = await executeSubagent(
          {
            name: "scout",
            model,
            systemPrompt: SCOUT_SYSTEM_PROMPT,
            customTools: createScoutTools(),
            thinkingLevel: "off",
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
                url,
                query,
                prompt,
                toolCalls: currentToolCalls,
                spinnerFrame,
                response: accumulated,
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
                url,
                query,
                prompt,
                toolCalls: currentToolCalls,
                spinnerFrame,
              },
            });
          },
        );

        if (result.aborted) {
          return {
            content: [{ type: "text" as const, text: "Aborted" }],
            details: {
              url,
              query,
              prompt,
              toolCalls: currentToolCalls,
              spinnerFrame,
              aborted: true,
              usage: result.usage,
            },
          };
        }

        if (result.error) {
          return {
            content: [
              { type: "text" as const, text: `Error: ${result.error}` },
            ],
            details: {
              url,
              query,
              prompt,
              toolCalls: currentToolCalls,
              spinnerFrame,
              error: result.error,
              usage: result.usage,
            },
          };
        }

        // Check if all tool calls failed
        const errorCount = currentToolCalls.filter(
          (tc) => tc.status === "error",
        ).length;
        const allFailed =
          currentToolCalls.length > 0 && errorCount === currentToolCalls.length;

        if (allFailed) {
          const error = "All tool calls failed";
          return {
            content: [{ type: "text" as const, text: `Error: ${error}` }],
            details: {
              url,
              query,
              prompt,
              toolCalls: currentToolCalls,
              spinnerFrame,
              error,
              usage: result.usage,
            },
          };
        }

        return {
          content: [{ type: "text" as const, text: result.content }],
          details: {
            url,
            query,
            prompt,
            toolCalls: currentToolCalls,
            spinnerFrame,
            response: result.content,
            usage: result.usage,
          },
        };
      } finally {
        clearInterval(spinnerInterval);
      }
    },

    renderCall(args, theme) {
      const container = new Container();

      // Title with model name
      const modelName = `${MODEL.provider}/${MODEL.model}`;
      container.addChild(
        new Text(
          theme.fg("toolTitle", theme.bold("Scout")) +
            theme.fg("muted", ` (${modelName})`),
          0,
          0,
        ),
      );

      // URL (if provided)
      if (args.url) {
        container.addChild(
          new Text(`  ${theme.fg("muted", "URL: ")}${args.url}`, 0, 0),
        );
      }

      // Query (if provided)
      if (args.query) {
        container.addChild(
          new Text(`  ${theme.fg("muted", "Query: ")}${args.query}`, 0, 0),
        );
      }

      // Prompt (if provided)
      if (args.prompt) {
        container.addChild(
          new Text(`  ${theme.fg("muted", "Prompt: ")}${args.prompt}`, 0, 0),
        );
      }

      return container;
    },

    renderResult(
      result: AgentToolResult<ScoutDetails>,
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

      const { toolCalls, spinnerFrame, response, aborted, error, usage } =
        details;

      // Counts
      const doneCount = toolCalls.filter((tc) => tc.status === "done").length;
      const runningCount = toolCalls.filter(
        (tc) => tc.status === "running",
      ).length;
      const errorCount = toolCalls.filter((tc) => tc.status === "error").length;

      // Aborted state
      if (aborted) {
        const suffix =
          doneCount > 0
            ? ` (${doneCount} ${pluralize(doneCount, "tool call")} completed)`
            : "";
        return new Text(
          theme.fg("warning", "Aborted") + theme.fg("muted", suffix),
          0,
          0,
        );
      }

      // Error state
      if (error) {
        return new Text(theme.fg("error", `Error: ${error}`), 0, 0);
      }

      // Running + collapsed: show current tool
      if (isPartial && !expanded) {
        const currentTool = toolCalls.find((tc) => tc.status === "running");
        if (currentTool) {
          const spinner = getSpinnerFrame(spinnerFrame);
          const { label, detail } = formatScoutToolCall(currentTool);
          const text = detail ? `${label} ${detail}` : label;
          return new Text(`${spinner} ${text}`, 0, 0);
        }
        return new Text(
          theme.fg("muted", `${getSpinnerFrame(spinnerFrame)} thinking...`),
          0,
          0,
        );
      }

      // Running + expanded: show all tool calls
      if (isPartial) {
        const container = new Container();

        // Status line
        const statusText =
          runningCount > 0
            ? `${doneCount} done, ${runningCount} running`
            : "Working...";
        container.addChild(new Text(theme.fg("muted", statusText), 0, 0));

        // Tool calls
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

            const { label, detail } = formatScoutToolCall(tc);
            const text = detail
              ? `${theme.bold(label)} ${detail}`
              : theme.bold(label);
            container.addChild(new Text(`${indicatorColored} ${text}`, 0, 0));
          }
        }

        return container;
      }

      // Done + collapsed
      if (!expanded) {
        const allFailed =
          toolCalls.length > 0 && errorCount === toolCalls.length;
        const stats = formatSubagentStats(
          usage ?? { estimatedTokens: Math.round((response?.length ?? 0) / 4) },
          toolCalls.length,
        );
        const indicator = allFailed ? INDICATOR.error : INDICATOR.done;
        const indicatorColor = allFailed ? "error" : "success";
        return new Text(
          theme.fg(indicatorColor, `${indicator} `) + theme.fg("muted", stats),
          0,
          0,
        );
      }

      // Done + expanded
      const container = new Container();

      // Stats line - only show error indicator when ALL tools failed
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

      // Tool calls summary
      if (toolCalls.length > 0) {
        const toolNames = toolCalls.map((tc) => formatScoutToolCall(tc).label);
        const counts: Record<string, number> = {};
        for (const name of toolNames) {
          counts[name] = (counts[name] || 0) + 1;
        }
        const summary = Object.entries(counts)
          .map(([name, count]) => (count > 1 ? `${name} x${count}` : name))
          .join(", ");

        container.addChild(
          new Text(
            theme.fg(
              "muted",
              `${toolCalls.length} ${pluralize(toolCalls.length, "tool call")}: `,
            ) + summary,
            0,
            0,
          ),
        );

        // Show failed tool calls with details
        const failedCalls = toolCalls.filter((tc) => tc.status === "error");
        for (const tc of failedCalls) {
          const { label, detail } = formatScoutToolCall(tc);
          const text = detail
            ? `${theme.bold(label)} ${detail}`
            : theme.bold(label);
          container.addChild(
            new Text(`${theme.fg("error", INDICATOR.error)} ${text}`, 0, 0),
          );
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
        container.addChild(new Text(theme.fg("muted", stats), 0, 0));
      }

      return container;
    },
  };
}

/** Execute the scout subagent directly (without tool wrapper) */
export async function executeScout(
  input: ScoutInput,
  ctx: ExtensionContext,
  onUpdate?: AgentToolUpdateCallback<ScoutDetails>,
  signal?: AbortSignal,
): Promise<AgentToolResult<ScoutDetails>> {
  const tool = createScoutTool();
  return tool.execute("direct", input, onUpdate, ctx, signal);
}
