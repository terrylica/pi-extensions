import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { AD_NOTIFY_ATTENTION_EVENT } from "../../../packages/events";

/**
 * Map of "provider/modelId" to the desired context window size in tokens.
 */
const CONTEXT_WINDOW_OVERRIDES: Record<string, number> = {
  "anthropic/claude-opus-4-6": 272_000,
  "anthropic/claude-opus-4-7": 272_000,
  "anthropic/claude-sonnet-4-6": 272_000,
};

interface ModelsJsonConfig {
  providers: Record<
    string,
    {
      baseUrl?: string;
      apiKey?: string;
      headers?: Record<string, string>;
      modelOverrides?: Record<
        string,
        { contextWindow?: number; maxTokens?: number }
      >;
      [key: string]: unknown;
    }
  >;
}

export function setupContextWindowOverrides(pi: ExtensionAPI): void {
  if (Object.keys(CONTEXT_WINDOW_OVERRIDES).length === 0) return;

  pi.on("session_start", async (_event, ctx) => {
    const modelsJsonPath = join(getAgentDir(), "models.json");

    let config: ModelsJsonConfig = { providers: {} };
    if (existsSync(modelsJsonPath)) {
      try {
        config = JSON.parse(
          readFileSync(modelsJsonPath, "utf-8"),
        ) as ModelsJsonConfig;
        if (!config.providers) config.providers = {};
      } catch {
        config = { providers: {} };
      }
    }

    // Collect drifted entries
    const drifted: Array<{
      provider: string;
      modelId: string;
      current: number | undefined;
      desired: number;
    }> = [];

    for (const [key, desired] of Object.entries(CONTEXT_WINDOW_OVERRIDES)) {
      const slashIdx = key.indexOf("/");
      if (slashIdx === -1) continue;
      const provider = key.slice(0, slashIdx);
      const modelId = key.slice(slashIdx + 1);

      const current =
        config.providers[provider]?.modelOverrides?.[modelId]?.contextWindow;
      if (current !== desired) {
        drifted.push({ provider, modelId, current, desired });
      }
    }

    if (drifted.length === 0) return;

    // Build human-readable list
    const lines = drifted.map(({ provider, modelId, current, desired }) => {
      const desiredStr = desired.toLocaleString();
      if (current === undefined) {
        return `  ${provider} / ${modelId}: missing (should be ${desiredStr})`;
      }
      return `  ${provider} / ${modelId}: ${current.toLocaleString()} → ${desiredStr}`;
    });

    ctx.ui.notify(
      "Context window overrides in models.json are out of date:\n" +
        lines.join("\n"),
      "warning",
    );
    pi.events.emit(AD_NOTIFY_ATTENTION_EVENT, {
      description: "Context window overrides in models.json are out of date.",
    });

    const confirmed = await ctx.ui.confirm(
      "Update models.json?",
      `The following context window overrides will be written to models.json:\n${lines.join("\n")}`,
    );

    if (!confirmed) return;

    // Deep-merge overrides into config
    for (const { provider, modelId, desired } of drifted) {
      if (!config.providers[provider]) {
        config.providers[provider] = {};
      }
      const providerConfig = config.providers[provider];
      if (!providerConfig.modelOverrides) {
        providerConfig.modelOverrides = {};
      }
      if (!providerConfig.modelOverrides[modelId]) {
        providerConfig.modelOverrides[modelId] = {};
      }
      providerConfig.modelOverrides[modelId].contextWindow = desired;
    }

    writeFileSync(modelsJsonPath, JSON.stringify(config, null, 2), "utf-8");
    await ctx.modelRegistry.refresh();
    ctx.ui.notify(
      "models.json updated. Context window overrides applied.",
      "info",
    );
  });
}
