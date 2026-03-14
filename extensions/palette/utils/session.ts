/**
 * Session-related utilities.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

export function getLastAssistantText(ctx: ExtensionContext): string | null {
  const entries = ctx.sessionManager.getEntries();

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!entry || entry.type !== "message") continue;

    const message = entry.message;
    if (!message || message.role !== "assistant") continue;

    return extractText(message.content);
  }

  return null;
}

function extractText(content: unknown): string | null {
  if (typeof content === "string") {
    const value = content.trim();
    return value.length > 0 ? value : null;
  }

  if (!Array.isArray(content)) return null;

  const chunks: string[] = [];
  for (const part of content) {
    if (typeof part === "string") {
      const value = part.trim();
      if (value) chunks.push(value);
      continue;
    }

    if (
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      "text" in part &&
      part.type === "text" &&
      typeof part.text === "string"
    ) {
      const value = part.text.trim();
      if (value) chunks.push(value);
    }
  }

  if (chunks.length === 0) return null;
  return chunks.join("\n");
}
