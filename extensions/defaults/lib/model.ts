import type { Theme } from "@mariozechner/pi-coding-agent";

const FAST_SYMBOL = "\u26A1 ";

/**
 * Build model line for footer line 2 right side
 */
export function buildModelLine(
  theme: Theme,
  provider: string | undefined,
  modelId: string | undefined,
  hasReasoning: boolean,
  thinkingLevel: string,
  codexFastModeEnabled = false,
): string {
  const fastPrefix =
    provider === "openai-codex" && codexFastModeEnabled ? FAST_SYMBOL : "";
  const providerName = `${fastPrefix}${provider ?? "unknown"}`;
  let modelLine = `${providerName}/${modelId ?? "no-model"}`;

  if (hasReasoning && thinkingLevel !== "off") {
    const formattedLevel = thinkingLevel.slice(0, 3); // min, med, max
    modelLine = `${providerName}/${modelId} (${formattedLevel})`;
  }

  return theme.fg("thinkingMinimal", modelLine);
}

/**
 * Build model ID only (no provider, no thinking level)
 */
export function buildModelIdLine(
  theme: Theme,
  modelId: string | undefined,
  provider?: string | undefined,
  codexFastModeEnabled = false,
): string {
  const fastPrefix =
    provider === "openai-codex" && codexFastModeEnabled ? FAST_SYMBOL : "";
  return theme.fg("thinkingMinimal", `${fastPrefix}${modelId ?? "no-model"}`);
}
