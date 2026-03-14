/**
 * Filters excluded palette bash messages from the LLM context.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function isExcludedPaletteBashMessage(message: unknown): boolean {
  if (!message || typeof message !== "object") return false;
  if (!("role" in message) || message.role !== "custom") return false;
  if (!("customType" in message) || message.customType !== "palette:bash") {
    return false;
  }
  if (!("details" in message) || typeof message.details !== "object") {
    return false;
  }
  if (!message.details || !("excluded" in message.details)) return false;
  return message.details.excluded === true;
}

export function registerContextFilter(pi: ExtensionAPI): void {
  pi.on("context", (event) => {
    const filtered = event.messages.filter(
      (message) => !isExcludedPaletteBashMessage(message),
    );
    return { messages: filtered };
  });
}
