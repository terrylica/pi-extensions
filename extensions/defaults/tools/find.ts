import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { relative, resolve } from "node:path";
import { ToolBody, ToolCallHeader, ToolFooter } from "@aliou/pi-utils-ui";
import type {
  AgentToolResult,
  ExtensionAPI,
  FindToolDetails,
  Theme,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import { keyHint } from "@mariozechner/pi-coding-agent";
import { type Component, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

const DEFAULT_LIMIT = 1000;

const BLOCKED_PATHS = new Set([
  homedir(),
  "/",
  "/Users",
  "/home",
  "/tmp",
  "/var",
  "/etc",
  "/opt",
  "/usr",
  "/System",
  "/Library",
  "/Applications",
  "/Volumes",
  "/nix",
  "/snap",
  "/proc",
  "/sys",
  "/dev",
  "/run",
  "/boot",
  "/sbin",
  "/bin",
]);

interface HarnessFindDetails extends FindToolDetails {
  relativeTo?: string;
  totalResults?: number;
}

export function setupFindTool(pi: ExtensionAPI): void {
  const wrappedSchema = Type.Object({
    pattern: Type.String({
      description: "The pattern to search for (glob or regex)",
    }),
    path: Type.Optional(
      Type.String({
        description: "The directory to search in (defaults to cwd)",
      }),
    ),
    limit: Type.Optional(
      Type.Number({
        description: `Maximum number of results (defaults to ${DEFAULT_LIMIT})`,
      }),
    ),
  });

  pi.registerTool<typeof wrappedSchema, HarnessFindDetails>({
    name: "find",
    label: "Find Files",
    description: `Find files by name using the \`fd\` command-line tool. Supports glob patterns and regex. Searches recursively from the specified path. Respects .gitignore. Results are truncated to ${DEFAULT_LIMIT} entries.`,
    parameters: wrappedSchema,
    promptGuidelines: [
      "Use find instead of shell find or fd when locating files in the project.",
      "Prefer passing path explicitly instead of scanning broad roots.",
    ],
    async execute(
      _toolCallId: string,
      params: {
        pattern: string;
        path?: string;
        limit?: number;
      },
      signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: {
        cwd: string;
      },
    ): Promise<{
      content: Array<{ type: "text"; text: string }>;
      details: HarnessFindDetails;
    }> {
      const pattern = params.pattern;
      const searchPath = params.path;
      const limit = params.limit ?? DEFAULT_LIMIT;

      // Handle abort signal
      if (signal?.aborted) {
        throw new Error("Search was aborted");
      }

      // Resolve the search path, expanding ~ to home directory
      let resolvedPath = searchPath || ".";
      // Expand ~ to home directory if path starts with ~ (but not ~something else like ~/foo)
      if (resolvedPath === "~" || resolvedPath.startsWith("~/")) {
        resolvedPath = resolvedPath.replace(/^~/, homedir());
      }
      const absoluteSearchPath = resolve(ctx.cwd, resolvedPath);

      // Block searching in overly broad directories
      if (BLOCKED_PATHS.has(absoluteSearchPath)) {
        throw new Error(
          `Searching '${absoluteSearchPath}' is not allowed — too broad. Narrow the search to a specific project or subdirectory.`,
        );
      }

      // Check if path exists
      if (!existsSync(absoluteSearchPath)) {
        throw new Error(`Path not found: ${absoluteSearchPath}`);
      }

      // Build fd arguments - NOTE: We intentionally omit --ignore-file flags
      // because fd natively discovers .gitignore files with correct directory scoping.
      // The native find tool had a bug where nested .gitignore files were passed via
      // --ignore-file, applying patterns globally instead of scoped to each directory.
      const fdArgs = [
        "--glob",
        "--color=never",
        "--hidden",
        "--max-results",
        String(limit),
        pattern,
        absoluteSearchPath,
      ];

      // Run fd command using pi.exec
      const result = await pi.exec("fd", fdArgs, {
        signal: signal ?? undefined,
        cwd: ctx.cwd,
      });

      // Handle abort
      if (result.killed && signal?.aborted) {
        throw new Error("Search was aborted");
      }

      // Handle non-zero exit with no stdout
      if (result.code !== 0 && !result.stdout) {
        throw new Error(result.stderr || "Unknown error");
      }

      // Process results - relativize paths to searchPath
      const allResults = result.stdout
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      // Handle empty results
      if (allResults.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No files found matching the pattern.",
            },
          ],
          details: {},
        };
      }

      const results = allResults.map((absolutePath) => {
        // Make path relative to searchPath
        if (absolutePath.startsWith(absoluteSearchPath)) {
          return absolutePath.slice(absoluteSearchPath.length + 1);
        }
        return absolutePath;
      });

      // Apply the limit
      const truncatedResults = results.slice(0, limit);
      const wasTruncated = results.length > truncatedResults.length;

      // Output is just the file paths — no inline notices
      const outputText = truncatedResults.join("\n");

      const details: HarnessFindDetails = {
        resultLimitReached: wasTruncated ? results.length : undefined,
        totalResults: results.length,
        relativeTo:
          searchPath && searchPath !== "." && searchPath !== "./"
            ? relative(ctx.cwd, absoluteSearchPath) || "."
            : undefined,
      };

      return {
        content: [
          {
            type: "text",
            text: outputText,
          },
        ],
        details,
      };
    },

    renderCall(
      args: {
        pattern: string;
        path?: string;
        limit?: number;
      },
      theme: Theme,
    ) {
      return new ToolCallHeader(
        {
          toolName: "find",
          mainArg: args.pattern,
          optionArgs: [
            ...(args.path ? [{ label: "in", value: args.path }] : []),
            ...(args.limit
              ? [{ label: "limit", value: String(args.limit) }]
              : []),
          ],
        },
        theme,
      );
    },

    renderResult(
      result: AgentToolResult<HarnessFindDetails>,
      options: ToolRenderResultOptions,
      theme: Theme,
    ) {
      const textContent = result.content[0];
      const output = (
        textContent?.type === "text" ? textContent.text : ""
      ).trim();

      // Simple one-line body for empty results
      if (!output || output === "No files found matching the pattern.") {
        return new Text(theme.fg("muted", output || "No result"), 0, 0);
      }

      const fields: Array<
        { label: string; value: string; showCollapsed?: boolean } | Text
      > = [];

      const filePaths = output.split("\n");
      const maxLines = options.expanded ? filePaths.length : 20;
      const displayLines = filePaths.slice(0, maxLines);
      const remaining = filePaths.length - maxLines;

      const lines = displayLines.map((line) => theme.fg("toolOutput", line));
      const resultField = new Text(lines.join("\n"), 0, 0);
      (resultField as Component & { showCollapsed?: boolean }).showCollapsed =
        true;
      fields.push(resultField);

      const details = result.details;
      const footerItems: Array<{
        label?: string;
        value: string;
        tone?: "muted" | "accent" | "success" | "warning" | "error";
      }> = [];

      if (remaining > 0) {
        footerItems.push({
          value: `${remaining} more lines, ${keyHint("app.tools.expand", "to expand")}`,
          tone: "muted",
        });
      }
      if (details?.totalResults) {
        footerItems.push({
          label: "results",
          value: String(details.totalResults),
          tone: "success",
        });
      }
      if (details?.resultLimitReached) {
        footerItems.push({
          label: "limit",
          value: String(details.resultLimitReached),
          tone: "warning",
        });
      }
      if (details?.relativeTo) {
        footerItems.push({
          label: "relative to",
          value: details.relativeTo,
          tone: "accent",
        });
      }

      const footer =
        footerItems.length > 0
          ? new ToolFooter(theme, { items: footerItems })
          : undefined;

      return new ToolBody({ fields, footer }, options, theme);
    },
  });
}
