import { lstat } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type {
  AgentToolResult,
  ExtensionAPI,
  ReadToolDetails,
  Theme,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import {
  createLsTool,
  createReadTool,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  getLanguageFromPath,
  highlightCode,
  keyHint,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { addHashlineTags } from "../lib/hashline";

function shortenPath(p: string): string {
  const home = homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

function replaceTabs(text: string): string {
  return text.replace(/\t/g, "   ");
}

/**
 * Override the built-in read tool to:
 * 1. Handle directories (delegate to ls)
 * 2. Add LINE#HASH tags to file content for use with the edit tool
 * 3. Strip LINE#HASH tags from user display via custom renderers
 */
export function setupReadTool(pi: ExtensionAPI): void {
  const cwd = process.cwd();
  const baseRead = createReadTool(cwd);

  // renderResult does not receive the tool call args (only content + details),
  // so we capture the resolved path from execute() for use in syntax highlighting.
  let lastPath: string | undefined;

  pi.registerTool({
    ...baseRead,
    description:
      "Read file contents. Each line is tagged with LINE#HASH for use with the edit tool. If the current model supports images, this tool can also read and display images (jpg, png, gif, webp).",
    // TODO: promptGuidelines not recognized by current pi-coding-agent types
    // promptGuidelines: [
    //   "read output uses LINE#HASH tags. Use these tags when editing with the edit tool.",
    //   "Use read instead of cat, head, or tail in bash.",
    // ],
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { path } = params as {
        path: string;
        offset?: number;
        limit?: number;
      };

      const toolCwd = ctx?.cwd ?? cwd;
      lastPath = resolve(toolCwd, path);

      const nativeRead = createReadTool(toolCwd);
      const nativeLs = createLsTool(toolCwd);

      // Resolve path relative to extension context's working directory
      const absolutePath = resolve(toolCwd, path);

      try {
        const stat = await lstat(absolutePath);

        if (stat.isDirectory()) {
          // Delegate to native ls when reading a directory
          return nativeLs.execute(toolCallId, { path }, signal, onUpdate);
        }
      } catch {
        // Path does not exist or cannot be accessed - let nativeRead handle the error
      }

      // Execute native read
      const result = await nativeRead.execute(
        toolCallId,
        params as { path: string; offset?: number; limit?: number },
        signal,
        onUpdate,
      );

      // Find text content block and add hashline tags
      const textBlock = result.content.find((c) => c.type === "text");
      if (textBlock && textBlock.type === "text") {
        const startLine = (params as { offset?: number }).offset ?? 1;
        textBlock.text = await addHashlineTags(textBlock.text, startLine);
      }
      // Image blocks pass through unchanged

      return result;
    },

    renderCall(
      args: { path: string; offset?: number; limit?: number },
      theme: Theme,
    ) {
      const path = shortenPath(args.path) || args.path;
      let pathDisplay = theme.fg("accent", path);

      if (args.offset !== undefined || args.limit !== undefined) {
        const startLine = args.offset ?? 1;
        const endLine =
          args.limit !== undefined ? startLine + args.limit - 1 : "";
        pathDisplay += theme.fg(
          "warning",
          `:${startLine}${endLine !== "" ? `-${endLine}` : ""}`,
        );
      }

      return new Text(
        `${theme.fg("toolTitle", theme.bold("read"))} ${pathDisplay}`,
        0,
        0,
      );
    },

    renderResult(
      result: AgentToolResult<unknown>,
      { expanded }: ToolRenderResultOptions,
      theme: Theme,
    ) {
      // Handle image content (pass-through, no hashes to strip)
      const imageBlock = result.content.find((c) => c.type === "image");
      if (imageBlock) {
        return new Text(theme.fg("toolOutput", "[image]"), 0, 0);
      }

      const textBlock = result.content.find((c) => c.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return new Text("", 0, 0);
      }

      // Strip LINE#HASH: tags for display only - model content is untouched
      const stripped = textBlock.text.replace(/^\d+#[A-Z]{2}:/gm, "");

      // Syntax highlight if language is detectable
      const lang = lastPath ? getLanguageFromPath(lastPath) : undefined;
      const lines = lang
        ? highlightCode(replaceTabs(stripped), lang)
        : stripped
            .split("\n")
            .map((l) => theme.fg("toolOutput", replaceTabs(l)));

      const maxLines = expanded ? lines.length : 10;
      const displayLines = lines.slice(0, maxLines);
      const remaining = lines.length - maxLines;

      let text = displayLines.join("\n");

      if (remaining > 0) {
        text += `${theme.fg("muted", `\n... (${remaining} more lines,`)} ${keyHint("expandTools", "to expand")})`;
      }

      // Truncation warnings
      const truncation = (result as AgentToolResult<ReadToolDetails>).details
        ?.truncation;
      if (truncation?.truncated) {
        if (truncation.firstLineExceedsLimit) {
          text += `\n${theme.fg("warning", `[First line exceeds ${formatSize(truncation.maxBytes ?? DEFAULT_MAX_BYTES)} limit]`)}`;
        } else if (truncation.truncatedBy === "lines") {
          text += `\n${theme.fg("warning", `[Truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines (${truncation.maxLines ?? DEFAULT_MAX_LINES} line limit)]`)}`;
        } else {
          text += `\n${theme.fg("warning", `[Truncated: ${truncation.outputLines} lines shown (${formatSize(truncation.maxBytes ?? DEFAULT_MAX_BYTES)} limit)]`)}`;
        }
      }

      return new Text(text, 0, 0);
    },
  });
}
