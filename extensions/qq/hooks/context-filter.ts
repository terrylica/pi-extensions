import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { QQ_MESSAGE_TYPE } from "../lib/types";

export function setupQqContextFilter(pi: ExtensionAPI): void {
  pi.on("context", async (event) => {
    const messages = event.messages.filter((message) => {
      const maybeCustom = message as { customType?: unknown };
      return maybeCustom.customType !== QQ_MESSAGE_TYPE;
    });

    return { messages };
  });
}
