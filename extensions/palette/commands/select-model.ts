import type { PaletteCommand } from "../registry/types";

export const selectModelCommand: PaletteCommand = {
  id: "model.select",
  title: "Select model",
  description: "Pick the active model",
  keywords: ["model", "provider", "switch"],
  group: "model",

  async run(c, io) {
    const models = c.ctx.modelRegistry.getAvailable();
    if (models.length === 0) {
      io.notify("No available models", "warning");
      return;
    }

    const providers = [...new Set(models.map((m) => m.provider))].sort();

    const providerPick = await io.pick({
      title: "Select provider",
      emptyText: "No providers",
      items: providers.map((p) => ({ value: p, label: p })),
    });
    if (!providerPick) return;

    const filtered = models.filter((m) => m.provider === providerPick.value);

    const modelPick = await io.pick({
      title: `Select model (${providerPick.value})`,
      emptyText: "No models",
      items: filtered.map((m) => {
        const isCurrent =
          c.ctx.model?.provider === m.provider && c.ctx.model?.id === m.id;
        return {
          value: m.id,
          label: m.id,
          description: isCurrent ? "current" : undefined,
          keywords: `${m.provider} ${m.id}`,
        };
      }),
    });
    if (!modelPick) return;

    const selected = filtered.find((m) => m.id === modelPick.value);
    if (!selected) return;

    const ok = await c.pi.setModel(selected);
    if (!ok) {
      io.notify("Could not set model", "error");
      return;
    }
  },
};
