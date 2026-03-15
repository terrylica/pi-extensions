import type { PaletteCommand } from "../registry/types";

export const selectThemeCommand: PaletteCommand = {
  id: "theme.select",
  title: "Select theme",
  keywords: ["theme", "color", "appearance", "dark", "light"],
  group: "appearance",

  async run(c, io) {
    const allThemes = c.ctx.ui.getAllThemes();
    if (allThemes.length === 0) {
      io.notify("No themes available", "warning");
      return;
    }

    const currentTheme = c.ctx.ui.theme;

    const pick = await io.pick({
      title: "Select theme",
      emptyText: "No themes",
      items: allThemes.map((t) => {
        const isCurrent = c.ctx.ui.getTheme(t.name) === currentTheme;
        return {
          value: t.name,
          label: t.name,
          description: [
            t.path ? "Custom" : "Built-in",
            isCurrent ? "current" : "",
          ]
            .filter(Boolean)
            .join(", "),
          keywords: t.path ? "custom" : "built-in",
        };
      }),
    });
    if (!pick) return;

    c.ctx.ui.setTheme(pick.value);
    io.notify(`Theme: ${pick.value}`, "info");
  },
};
