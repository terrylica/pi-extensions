import { copyToClipboard } from "@mariozechner/pi-coding-agent";
import type { PaletteCommand } from "../registry/types";
import { getLastAssistantText } from "../utils/session";

export const copyLastAssistantCommand: PaletteCommand = {
  id: "clipboard.copy-last",
  title: "Copy last assistant message",
  description: "Copy to clipboard",
  keywords: ["copy", "clipboard", "assistant"],
  group: "clipboard",

  isEnabled(c) {
    const text = getLastAssistantText(c.ctx);
    if (!text) {
      return { enabled: false, reason: "No assistant message found" };
    }
    return true;
  },

  async run(c, io) {
    const text = getLastAssistantText(c.ctx);
    if (!text) {
      io.notify("No assistant message found", "warning");
      return;
    }

    try {
      copyToClipboard(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      io.notify(`Copy failed: ${message}`, "error");
    }
  },
};
