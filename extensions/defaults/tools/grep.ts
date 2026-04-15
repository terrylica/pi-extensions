import { existsSync, lstatSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { ToolBody, ToolCallHeader, ToolFooter } from "@aliou/pi-utils-ui";
import type {
  AgentToolResult,
  ExtensionAPI,
  GrepToolDetails,
  Theme,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import {
  DEFAULT_MAX_BYTES,
  formatSize,
  keyHint,
  truncateHead,
  truncateLine,
} from "@mariozechner/pi-coding-agent";
import { type Component, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

const DEFAULT_LIMIT = 100;
const GREP_MAX_LINE_LENGTH = 500;

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

interface RgMatch {
  filePath: string;
  lineNumber: number;
}

interface HarnessGrepDetails extends GrepToolDetails {
  relativeTo?: string;
  matchCount?: number;
}

export function setupGrepTool(pi: ExtensionAPI): void {
  const wrappedSchema = Type.Object({
    pattern: Type.String({
      description: "Search pattern (regex or literal string)",
    }),
    path: Type.Optional(
      Type.String({
        description: "Directory or file to search (default: current directory)",
      }),
    ),
    glob: Type.Optional(
      Type.String({
        description:
          "Filter files by glob pattern, e.g. '*.ts' or '**/*.spec.ts'",
      }),
    ),
    ignoreCase: Type.Optional(
      Type.Boolean({
        description: "Case-insensitive search (default: false)",
      }),
    ),
    literal: Type.Optional(
      Type.Boolean({
        description:
          "Treat pattern as literal string instead of regex (default: false)",
      }),
    ),
    context: Type.Optional(
      Type.Number({
        description:
          "Number of lines to show before and after each match (default: 0)",
      }),
    ),
    limit: Type.Optional(
      Type.Number({
        description: `Maximum number of matches to return (default: ${DEFAULT_LIMIT})`,
      }),
    ),
  });

  pi.registerTool<typeof wrappedSchema, HarnessGrepDetails | undefined>({
    name: "grep",
    label: "grep",
    description: `Search file contents for a pattern. Returns matching lines with file paths and line numbers. Respects .gitignore. Output is truncated to ${DEFAULT_LIMIT} matches or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). Long lines are truncated to ${GREP_MAX_LINE_LENGTH} chars.`,
    parameters: wrappedSchema,
    promptGuidelines: [
      "Search file contents for patterns (respects .gitignore)",
    ],
    async execute(
      _toolCallId: string,
      params: {
        pattern: string;
        path?: string;
        glob?: string;
        ignoreCase?: boolean;
        literal?: boolean;
        context?: number;
        limit?: number;
      },
      signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: {
        cwd: string;
      },
    ): Promise<{
      content: Array<{ type: "text"; text: string }>;
      details: HarnessGrepDetails | undefined;
    }> {
      const {
        pattern,
        path: searchDir,
        glob,
        ignoreCase,
        literal,
        context,
        limit,
      } = params;

      // Handle abort signal
      if (signal?.aborted) {
        return {
          content: [{ type: "text" as const, text: "Operation aborted" }],
          details: undefined,
        };
      }

      // Resolve the search path, expanding ~ to home directory
      let resolvedPath = searchDir || ".";
      if (resolvedPath === "~" || resolvedPath.startsWith("~/")) {
        resolvedPath = resolvedPath.replace(/^~/, homedir());
      }
      const absoluteSearchPath = resolve(ctx.cwd, resolvedPath);

      // Block searching in overly broad directories
      if (BLOCKED_PATHS.has(absoluteSearchPath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Searching '${absoluteSearchPath}' is not allowed — too broad. Narrow the search to a specific project or subdirectory.`,
            },
          ],
          details: undefined,
        };
      }

      // Check if path exists
      if (!existsSync(absoluteSearchPath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Path not found: ${absoluteSearchPath}`,
            },
          ],
          details: undefined,
        };
      }

      // Determine if searching a directory
      let isDirectory = false;
      try {
        isDirectory = lstatSync(absoluteSearchPath).isDirectory();
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Cannot stat path: ${absoluteSearchPath}`,
            },
          ],
          details: undefined,
        };
      }

      const contextValue = context && context > 0 ? context : 0;
      const effectiveLimit = Math.max(1, limit ?? DEFAULT_LIMIT);

      // Build rg arguments
      const rgArgs = ["--json", "--line-number", "--color=never", "--hidden"];
      if (ignoreCase) rgArgs.push("--ignore-case");
      if (literal) rgArgs.push("--fixed-strings");
      if (glob) rgArgs.push("--glob", glob);
      rgArgs.push(pattern, absoluteSearchPath);

      // Run rg using pi.exec
      const result = await pi.exec("rg", rgArgs, {
        signal: signal ?? undefined,
        cwd: ctx.cwd,
      });

      // Handle abort
      if (result.killed && signal?.aborted) {
        return {
          content: [{ type: "text" as const, text: "Operation aborted" }],
          details: undefined,
        };
      }

      // Handle non-zero exit (code 1 means no matches, which is fine)
      if (result.code !== 0 && result.code !== 1) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error running rg: ${result.stderr || `ripgrep exited with code ${result.code}`}`,
            },
          ],
          details: undefined,
        };
      }

      // Parse rg JSON output to collect matches
      const matches: RgMatch[] = [];
      let matchCount = 0;
      let matchLimitReached = false;

      for (const line of result.stdout.split("\n")) {
        if (!line.trim()) continue;
        let event: {
          type: string;
          data?: { path?: { text: string }; line_number?: number };
        };
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        if (event.type === "match") {
          matchCount++;
          const filePath = event.data?.path?.text;
          const lineNumber = event.data?.line_number;
          if (filePath && typeof lineNumber === "number") {
            if (matches.length < effectiveLimit) {
              matches.push({ filePath, lineNumber });
            }
          }
          if (matchCount >= effectiveLimit) {
            matchLimitReached = true;
          }
        }
      }

      // No matches found
      if (matches.length === 0) {
        return {
          content: [{ type: "text", text: "No matches found" }],
          details: undefined,
        };
      }

      // Format path relative to search directory
      const formatPath = (filePath: string): string => {
        if (isDirectory) {
          const relative = filePath
            .slice(absoluteSearchPath.length)
            .replace(/^[/\\]/, "");
          if (relative) return relative.replace(/\\/g, "/");
        }
        return filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;
      };

      // File cache for reading context lines
      const fileCache = new Map<string, string[]>();
      const getFileLines = (filePath: string): string[] => {
        let lines = fileCache.get(filePath);
        if (!lines) {
          try {
            const content = readFileSync(filePath, "utf-8");
            lines = content
              .replace(/\r\n/g, "\n")
              .replace(/\r/g, "\n")
              .split("\n");
          } catch {
            lines = [];
          }
          fileCache.set(filePath, lines);
        }
        return lines;
      };

      // Format each match with optional context
      let linesTruncated = false;
      const outputLines: string[] = [];

      for (const match of matches) {
        const relativePath = formatPath(match.filePath);
        const lines = getFileLines(match.filePath);

        if (!lines.length) {
          outputLines.push(
            `${relativePath}:${match.lineNumber}: (unable to read file)`,
          );
          continue;
        }

        const start =
          contextValue > 0
            ? Math.max(1, match.lineNumber - contextValue)
            : match.lineNumber;
        const end =
          contextValue > 0
            ? Math.min(lines.length, match.lineNumber + contextValue)
            : match.lineNumber;

        for (let current = start; current <= end; current++) {
          const lineText = (lines[current - 1] ?? "").replace(/\r/g, "");
          const isMatchLine = current === match.lineNumber;
          const { text: truncatedText, wasTruncated } = truncateLine(lineText);
          if (wasTruncated) linesTruncated = true;
          if (isMatchLine)
            outputLines.push(`${relativePath}:${current}: ${truncatedText}`);
          else outputLines.push(`${relativePath}-${current}- ${truncatedText}`);
        }
      }

      // Apply byte truncation
      const rawOutput = outputLines.join("\n");
      const truncation = truncateHead(rawOutput, {
        maxLines: Number.MAX_SAFE_INTEGER,
      });
      const output = truncation.content;

      // Build details — notices go here, not in content.text
      const details: HarnessGrepDetails = {
        matchCount,
        relativeTo:
          isDirectory && searchDir && searchDir !== "." && searchDir !== "./"
            ? searchDir
            : undefined,
      };
      if (matchLimitReached) details.matchLimitReached = effectiveLimit;
      if (truncation.truncated) details.truncation = truncation;
      if (linesTruncated) details.linesTruncated = true;

      return {
        content: [{ type: "text", text: output }],
        details: Object.keys(details).length > 0 ? details : undefined,
      };
    },

    renderCall(
      args: {
        pattern: string;
        path?: string;
        glob?: string;
        ignoreCase?: boolean;
        literal?: boolean;
        context?: number;
        limit?: number;
      },
      theme: Theme,
    ) {
      return new ToolCallHeader(
        {
          toolName: "grep",
          mainArg: `/${args.pattern || ""}/`,
          optionArgs: [
            ...(args.path ? [{ label: "in", value: args.path }] : []),
            ...(args.glob ? [{ label: "glob", value: args.glob }] : []),
            ...(args.limit
              ? [{ label: "limit", value: String(args.limit) }]
              : []),
            ...(args.ignoreCase
              ? [{ label: "icase", value: "true", tone: "accent" as const }]
              : []),
            ...(args.literal ? [{ label: "literal", value: "true" }] : []),
            ...(args.context
              ? [{ label: "ctx", value: String(args.context) }]
              : []),
          ],
        },
        theme,
      );
    },

    renderResult(
      result: AgentToolResult<HarnessGrepDetails | undefined>,
      options: ToolRenderResultOptions,
      theme: Theme,
    ) {
      const textContent = result.content[0];
      const output = (
        textContent?.type === "text" ? textContent.text : ""
      ).trim();

      // Simple one-line body for empty/error results
      if (
        !output ||
        output === "No matches found" ||
        output.startsWith("Error") ||
        output === "Operation aborted"
      ) {
        return new Text(theme.fg("muted", output || "No result"), 0, 0);
      }

      const fields: Array<
        { label: string; value: string; showCollapsed?: boolean } | Text
      > = [];

      const matchLines = output.split("\n");
      const maxLines = options.expanded ? matchLines.length : 15;
      const displayLines = matchLines.slice(0, maxLines);
      const remaining = matchLines.length - maxLines;

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
      if (details?.matchCount) {
        footerItems.push({
          label: "matches",
          value: String(details.matchCount),
          tone: "success",
        });
      }
      if (details?.matchLimitReached) {
        footerItems.push({
          label: "limit",
          value: String(details.matchLimitReached),
          tone: "warning",
        });
      }
      if (details?.truncation?.truncated) {
        footerItems.push({
          value: `${formatSize(DEFAULT_MAX_BYTES)} limit`,
          tone: "warning",
        });
      }
      if (details?.linesTruncated) {
        footerItems.push({
          value: "lines truncated",
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
