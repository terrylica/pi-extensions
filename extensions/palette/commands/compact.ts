import type { PaletteCommand } from "../registry/types";

export const compactCommand: PaletteCommand = {
  id: "compact",
  title: "Compact context",
  keywords: ["compact", "context", "summarize"],
  group: "session",

  isEnabled(c) {
    if (!c.ctx.isIdle()) {
      return {
        enabled: false,
        reason: "Wait for the current response to finish",
      };
    }
    return true;
  },

  async run(c, _io) {
    c.ctx.compact();
  },
};
