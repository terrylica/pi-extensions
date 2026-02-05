/**
 * Session content reader for handoff context extraction.
 *
 * Reads the current session's JSONL file and extracts conversation content
 * in a format suitable for LLM-based context extraction.
 */

import { readFileSync } from "node:fs";
import type {
  AssistantMessage,
  TextContent,
  ToolCall,
  ToolResultMessage,
  UserMessage,
} from "@mariozechner/pi-ai";
import type {
  ExtensionContext,
  SessionEntry,
  SessionMessageEntry,
} from "@mariozechner/pi-coding-agent";
import { parseSessionEntries } from "@mariozechner/pi-coding-agent";

/**
 * Read the raw JSONL content from the current session file.
 *
 * Returns null if:
 * - No session file exists (ephemeral session)
 * - Session file is empty or unreadable
 */
export function readRawSessionContent(
  sessionManager: ExtensionContext["sessionManager"],
): string | null {
  const sessionFile = sessionManager.getSessionFile();
  if (!sessionFile) return null;

  try {
    const raw = readFileSync(sessionFile, "utf-8");
    return raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Read the current session file and return a text representation
 * of the conversation, filtering out system prompts and tool definitions.
 *
 * Returns null if:
 * - No session file exists (ephemeral session)
 * - Session file is empty or unreadable
 * - No conversation messages found
 */
export function readCurrentSessionContent(
  sessionManager: ExtensionContext["sessionManager"],
): string | null {
  const raw = readRawSessionContent(sessionManager);
  if (!raw) return null;

  const entries = parseSessionEntries(raw);
  if (entries.length === 0) return null;

  const lines: string[] = [];

  for (const entry of entries) {
    const sessionEntry = entry as SessionEntry;
    if (sessionEntry.type !== "message") continue;

    const msgEntry = sessionEntry as SessionMessageEntry;
    const msg = msgEntry.message;

    if (msg.role === "user") {
      const userMsg = msg as UserMessage;
      const text = extractText(userMsg.content);
      if (text) {
        lines.push(`## User\n\n${text}`);
      }
    } else if (msg.role === "assistant") {
      const assistantMsg = msg as AssistantMessage;
      const parts: string[] = [];

      for (const block of assistantMsg.content) {
        if (block.type === "text") {
          const textBlock = block as TextContent;
          parts.push(textBlock.text);
        } else if (block.type === "toolCall") {
          const tc = block as ToolCall;
          parts.push(`[Tool call: ${tc.name}(${formatArgs(tc.arguments)})]`);
        }
      }

      const text = parts.join("\n");
      if (text) {
        lines.push(`## Assistant\n\n${text}`);
      }
    } else if (msg.role === "toolResult") {
      const toolResultMsg = msg as ToolResultMessage;
      const formatted = formatToolResult(toolResultMsg);
      if (formatted) {
        lines.push(`## Tool Result\n\n${formatted}`);
      }
    }
  }

  if (lines.length === 0) return null;
  return lines.join("\n\n---\n\n");
}

/**
 * Extract text from user message content (string or content array).
 */
function extractText(
  content: string | (TextContent | { type: string; text?: string })[],
): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (c): c is TextContent =>
          typeof c === "object" && c !== null && c.type === "text",
      )
      .map((c) => c.text)
      .join("\n");
  }
  return "";
}

/**
 * Format tool call arguments for display.
 * Shows a compact representation of the arguments.
 */
function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return "";

  return entries
    .map(([key, value]) => {
      if (typeof value === "string") {
        const truncated =
          value.length > 80 ? `${value.slice(0, 80)}...` : value;
        return `${key}: "${truncated}"`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    })
    .join(", ");
}

/**
 * Maximum characters for tool result content before truncation.
 */
const MAX_TOOL_RESULT_LENGTH = 2000;

/**
 * Format a tool result message for inclusion in session content.
 * Truncates large results to avoid bloating the extraction context.
 */
function formatToolResult(msg: ToolResultMessage): string | null {
  const toolName = msg.toolName ?? "unknown";
  let content = "";

  for (const block of msg.content) {
    if (block.type === "text") {
      content += block.text;
    }
  }

  if (!content.trim()) return null;

  // Truncate if too long
  const isTruncated = content.length > MAX_TOOL_RESULT_LENGTH;
  const displayContent = isTruncated
    ? `${content.slice(0, MAX_TOOL_RESULT_LENGTH)}...\n\n[truncated, showing first ${MAX_TOOL_RESULT_LENGTH} chars]`
    : content;

  return `**${toolName}:**\n${displayContent}`;
}
