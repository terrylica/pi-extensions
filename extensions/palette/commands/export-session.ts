import type { PaletteCommand } from "../registry/types";
import { submitSlashCommandViaEditor } from "../utils/submit-command";

export const exportSessionCommand: PaletteCommand = {
  id: "session.export",
  title: "Export session",
  description: "Export current session to HTML",
  keywords: ["export", "session", "html", "share"],
  group: "session",

  isEnabled(c) {
    if (!c.ctx.sessionManager.getSessionFile()) {
      return {
        enabled: false,
        reason: "Current session is not persisted yet",
      };
    }

    return true;
  },

  async run(c) {
    await submitSlashCommandViaEditor(c.ctx, "/export");
  },
};
