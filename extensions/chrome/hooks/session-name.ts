import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { generateAndSetTitle } from "../lib/title";

interface SessionNameState {
  hasAutoNamed: boolean;
}

function isTurnCompleted(event: unknown): boolean {
  if (!event || typeof event !== "object") return false;
  const message = (event as { message?: unknown }).message;
  if (!message || typeof message !== "object") return false;
  const stopReason = (message as { stopReason?: unknown }).stopReason;
  return typeof stopReason === "string" && stopReason.toLowerCase() === "stop";
}

export function setupSessionNameHook(pi: ExtensionAPI) {
  const state: SessionNameState = {
    hasAutoNamed: false,
  };

  pi.on("session_start", async () => {
    state.hasAutoNamed = false;
  });

  pi.on("turn_end", async (event, ctx) => {
    if (state.hasAutoNamed) return;

    if (pi.getSessionName()) {
      state.hasAutoNamed = true;
      return;
    }

    if (!isTurnCompleted(event)) {
      return;
    }

    await generateAndSetTitle(pi, ctx);
    state.hasAutoNamed = true;
  });
}
