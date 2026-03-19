import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { PaletteCommand } from "../registry/types";

interface AgentSettings {
  enabledModels?: unknown;
}

async function readEnabledModelRefs(): Promise<string[]> {
  const settingsPath = join(
    process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent"),
    "settings.json",
  );

  const raw = await readFile(settingsPath, "utf8");
  const settings = JSON.parse(raw) as AgentSettings;
  if (!Array.isArray(settings.enabledModels)) return [];

  return settings.enabledModels.filter(
    (value): value is string =>
      typeof value === "string" && value.includes("/"),
  );
}

export const selectModelCommand: PaletteCommand = {
  id: "model.select",
  title: "Select model",
  keywords: ["model", "provider", "switch"],
  group: "model",

  async run(c, io) {
    let enabledRefs: string[];
    try {
      enabledRefs = await readEnabledModelRefs();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      io.notify(`Could not read settings.json: ${message}`, "error");
      return;
    }

    if (enabledRefs.length === 0) {
      io.notify("No enabled models in settings.json", "warning");
      return;
    }

    enabledRefs.sort((a, b) => {
      const slashA = a.indexOf("/");
      const slashB = b.indexOf("/");
      const providerA = slashA >= 0 ? a.slice(0, slashA) : a;
      const providerB = slashB >= 0 ? b.slice(0, slashB) : b;
      const modelA = slashA >= 0 ? a.slice(slashA + 1) : "";
      const modelB = slashB >= 0 ? b.slice(slashB + 1) : "";
      const providerCmp = providerA.localeCompare(providerB);
      return providerCmp !== 0 ? providerCmp : modelA.localeCompare(modelB);
    });

    const providerWidth = enabledRefs.reduce((max, ref) => {
      const slash = ref.indexOf("/");
      const provider = slash >= 0 ? ref.slice(0, slash) : ref;
      return Math.max(max, provider.length);
    }, 0);

    const currentRef = c.ctx.model
      ? `${c.ctx.model.provider}/${c.ctx.model.id}`
      : undefined;

    const registryModels = c.ctx.modelRegistry.getAll();
    const items = enabledRefs.map((ref) => {
      const slash = ref.indexOf("/");
      const provider = ref.slice(0, slash);
      const modelId = ref.slice(slash + 1);
      const model = registryModels.find(
        (entry) => entry.provider === provider && entry.id === modelId,
      );
      const isCurrent =
        c.ctx.model?.provider === provider && c.ctx.model?.id === modelId;

      return {
        ref,
        model,
        item: {
          value: ref,
          label: `${provider.padStart(providerWidth)}  ${modelId}`,
          description: isCurrent ? "current" : undefined,
          keywords: ref,
        },
      };
    });

    const modelPick = await io.pick({
      title: "Switch model",
      emptyText: "No models",
      items: items.map((entry) => entry.item),
      initialValue: currentRef,
    });
    if (!modelPick) return;

    const selected = items.find(
      (entry) => entry.ref === modelPick.value,
    )?.model;
    if (!selected) {
      io.notify("Selected model is not available in registry", "error");
      return;
    }

    const ok = await c.pi.setModel(selected);
    if (!ok) {
      io.notify("Could not set model", "error");
    }
  },
};
