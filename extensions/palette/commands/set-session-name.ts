import type { PaletteCommand } from "../registry/types";

export const setSessionNameCommand: PaletteCommand = {
  id: "session.name",
  title: "Set session name",
  description: "Rename the current session",
  keywords: ["name", "rename", "session"],
  group: "session",

  async run(c, io) {
    const name = await io.input({
      title: "Session name",
      placeholder: "Enter new session name",
      initialValue: c.pi.getSessionName() ?? "",
    });

    if (!name) return;

    c.pi.setSessionName(name);
  },
};
