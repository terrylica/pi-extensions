/**
 * Format scout tool calls for display.
 */

import type { SubagentToolCall } from "../../lib/types";

export interface FormattedToolCall {
  label: string;
  detail?: string;
}

/**
 * Format a scout tool call for display.
 *
 * Examples:
 * - fetch_url: "Fetch example.com"
 * - search: "Search 'typescript best practices'"
 * - github: "GitHub owner/repo" or "GitHub owner/repo#123"
 */
export function formatScoutToolCall(
  toolCall: SubagentToolCall,
): FormattedToolCall {
  const { toolName, args } = toolCall;

  switch (toolName) {
    case "fetch_url": {
      const url = args.url as string | undefined;
      if (url) {
        try {
          const parsed = new URL(url);
          return { label: "Fetch", detail: parsed.hostname + parsed.pathname };
        } catch {
          return { label: "Fetch", detail: url };
        }
      }
      return { label: "Fetch" };
    }

    case "search": {
      const query = args.query as string | undefined;
      return { label: "Search", detail: query ? `'${query}'` : undefined };
    }

    case "github": {
      const url = args.url as string | undefined;
      if (url) {
        try {
          const parsed = new URL(url);
          const parts = parsed.pathname.split("/").filter(Boolean);
          if (parts.length >= 2) {
            const owner = parts[0];
            const repo = parts[1];
            // Check for issue/PR
            if (parts[2] === "issues" && parts[3]) {
              return {
                label: "GitHub",
                detail: `${owner}/${repo}#${parts[3]}`,
              };
            }
            if (parts[2] === "pull" && parts[3]) {
              return {
                label: "GitHub",
                detail: `${owner}/${repo}#${parts[3]} (PR)`,
              };
            }
            // Check for file path
            if (parts[2] === "blob" && parts.length > 4) {
              const filePath = parts.slice(4).join("/");
              return {
                label: "GitHub",
                detail: `${owner}/${repo}/${filePath}`,
              };
            }
            return { label: "GitHub", detail: `${owner}/${repo}` };
          }
        } catch {
          return { label: "GitHub", detail: url };
        }
      }
      return { label: "GitHub" };
    }

    default:
      return { label: toolName };
  }
}
