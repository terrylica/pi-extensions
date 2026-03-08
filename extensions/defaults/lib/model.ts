import type { Theme } from "@mariozechner/pi-coding-agent";

/**
 * Build model line for footer line 2 right side
 */
export function buildModelLine(
  theme: Theme,
  provider: string | undefined,
  modelId: string | undefined,
  hasReasoning: boolean,
  thinkingLevel: string,
): string {
  const providerName = provider ?? "unknown";
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
): string {
  return theme.fg("thinkingMinimal", modelId ?? "no-model");
}
