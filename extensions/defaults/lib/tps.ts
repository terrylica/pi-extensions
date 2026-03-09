import type { AssistantMessage, Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// Track latest assistant response for TPS calculation
let latestAssistantOutput = 0;
let latestStreamingDurationMs = 0;

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
  if (latestAssistantOutput > 0 && latestStreamingDurationMs > 0) {
    const tps = latestAssistantOutput / (latestStreamingDurationMs / 1000);
    return `${tps.toFixed(1)}tps`;
  }
  return "";
}

/**
 * Setup TPS tracking - only counts actual streaming time, excluding tool calls
 */
export function setupTPSTracking(pi: ExtensionAPI): void {
  let messageStartMs: number | null = null;
  let streamingDurationMs = 0;
  let toolExecutionCount = 0;
  let currentAssistantMessage: AssistantMessage | null = null;

  pi.on("agent_start", () => {
    // Reset tracking for new agent run
    streamingDurationMs = 0;
    toolExecutionCount = 0;
    currentAssistantMessage = null;
  });

  // Track when assistant message streaming starts
  pi.on("message_start", (event) => {
    const message = event.message as Message;
    if (message.role === "assistant") {
      currentAssistantMessage = message as AssistantMessage;
      // Only start timer if not currently in tool execution
      if (toolExecutionCount === 0) {
        messageStartMs = Date.now();
      }
    }
  });

  // Track when assistant message streaming ends
  pi.on("message_end", (event) => {
    const message = event.message as Message;
    if (message.role === "assistant" && messageStartMs !== null) {
      streamingDurationMs += Date.now() - messageStartMs;
      messageStartMs = null;
    }
  });

  // Pause timing during tool execution
  pi.on("tool_execution_start", () => {
    toolExecutionCount++;
    // If we were timing a message, pause it
    if (messageStartMs !== null) {
      streamingDurationMs += Date.now() - messageStartMs;
      messageStartMs = null;
    }
  });

  // Resume timing after tool execution
  pi.on("tool_execution_end", () => {
    toolExecutionCount = Math.max(0, toolExecutionCount - 1);
    // Resume timing if there's an assistant message and no more tools running
    if (toolExecutionCount === 0 && currentAssistantMessage !== null) {
      messageStartMs = Date.now();
    }
  });

  pi.on("agent_end", (event) => {
    // Finalize any ongoing timing
    if (messageStartMs !== null) {
      streamingDurationMs += Date.now() - messageStartMs;
      messageStartMs = null;
    }

    // Find the last assistant message with usage in this batch
    for (let i = event.messages.length - 1; i >= 0; i--) {
      const message = event.messages[i];
      if (isAssistantMessage(message) && message.usage?.output) {
        latestAssistantOutput = message.usage.output;
        latestStreamingDurationMs = streamingDurationMs;
        break;
      }
    }
  });
}
