/**
 * Standalone web fetch tool using Linkup API.
 *
 * This tool fetches a URL and returns its content as markdown,
 * without any LLM processing.
 */

import type {
  AgentToolResult,
  Theme,
  ToolDefinition,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { createLinkupClient } from "../clients";

const parameters = Type.Object({
  url: Type.String({
    description: "The URL to fetch content from",
  }),
  renderJs: Type.Optional(
    Type.Boolean({
      description: "Render JavaScript on the page (default: true)",
    }),
  ),
});

/** Cost per fetch in EUR */
const COST_EUR = 0.005;

/** Details for rendering */
interface WebFetchDetails {
  url: string;
  cost: number;
  error?: string;
}

export const webFetchTool: ToolDefinition<typeof parameters, WebFetchDetails> =
  {
    name: "web_fetch",
    label: "Web Fetch",
    description: `Fetch a URL and return its content as markdown. No LLM processing - returns raw converted content.

Use for:
- Reading documentation pages
- Fetching article content
- Getting webpage text

Requires: LINKUP_API_KEY environment variable`,

    parameters,

    async execute(
      _toolCallId: string,
      args: { url: string; renderJs?: boolean },
      _onUpdate: unknown,
      _ctx: unknown,
      signal?: AbortSignal,
    ) {
      const { url, renderJs = true } = args;

      try {
        const client = createLinkupClient();
        const response = await client.fetch({ url, renderJs }, signal);

        if (!response.markdown) {
          return {
            content: [
              { type: "text" as const, text: "No content returned for URL" },
            ],
            details: { url, cost: COST_EUR, error: "No content" },
          };
        }

        return {
          content: [{ type: "text" as const, text: response.markdown }],
          details: { url, cost: COST_EUR },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          details: { url, cost: 0, error: message },
        };
      }
    },

    renderCall(args: { url: string; renderJs?: boolean }, theme: Theme) {
      let text = theme.fg("toolTitle", theme.bold("web_fetch "));
      text += theme.fg("muted", args.url);
      return new Text(text, 0, 0);
    },

    renderResult(
      result: AgentToolResult<WebFetchDetails>,
      { expanded }: ToolRenderResultOptions,
      theme: Theme,
    ) {
      const details = result.details;

      if (details?.error) {
        return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
      }

      let text = theme.fg("success", "done");
      if (details?.cost && details.cost > 0) {
        text += theme.fg("muted", ` ${details.cost}EUR`);
      }

      if (expanded && result.content?.[0]?.type === "text") {
        const content = (result.content[0] as { text: string }).text;
        // Truncate for display
        const truncated =
          content.length > 500 ? `${content.slice(0, 500)}...` : content;
        text += `\n${theme.fg("toolOutput", truncated)}`;
      }

      return new Text(text, 0, 0);
    },
  };

/** Create the web_fetch tool */
export function createWebFetchTool(): ToolDefinition<
  typeof parameters,
  WebFetchDetails
> {
  return webFetchTool;
}
