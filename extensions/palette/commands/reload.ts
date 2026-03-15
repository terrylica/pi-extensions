import type { PaletteCommand } from "../registry/types";
import { submitSlashCommandViaEditor } from "../utils/submit-command";

export const reloadCommand: PaletteCommand = {
  id: "reload",
  title: "Reload",
  description: "Extensions, skills, themes",
  keywords: ["reload", "refresh", "restart"],
  group: "session",

  async run(c) {
    await submitSlashCommandViaEditor(c.ctx, "/reload");
  },
};
