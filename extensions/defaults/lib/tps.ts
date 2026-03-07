import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// Track latest assistant response for TPS calculation
let latestAssistantOutput = 0;
let latestAssistantDuration = 0;

// Type guard for assistant messages
function isAssistantMessage(message: unknown): message is AssistantMessage {
  if (!message || typeof message !== "object") return false;
  const role = (message as { role?: unknown }).role;
  return role === "assistant";
}

/**
 * Get TPS string for display
 */
export function getTPS(): string {
  if (latestAssistantOutput > 0 && latestAssistantDuration > 0) {
    const tps = latestAssistantOutput / latestAssistantDuration;
    return `${tps.toFixed(1)}tps`;
  }
  return "";
}

/**
 * Setup TPS tracking
 */
export function setupTPSTracking(pi: ExtensionAPI): void {
  let startMs: number | null = null;

  pi.on("agent_start", () => {
    startMs = Date.now();
  });

  pi.on("agent_end", (event) => {
    if (!startMs) return;

    const elapsedMs = Date.now() - startMs;
    startMs = null;

    if (elapsedMs <= 0) return;

    // Find the last assistant message in this batch
    for (let i = event.messages.length - 1; i >= 0; i--) {
      const message = event.messages[i];
      if (isAssistantMessage(message) && message.usage?.output) {
        latestAssistantOutput = message.usage.output;
        latestAssistantDuration = elapsedMs / 1000; // Convert to seconds
        break;
      }
    }
  });
}
