import type { Theme } from "@mariozechner/pi-coding-agent";

const FAST_SYMBOL = "\u26A1";
const VERBOSITY_LOW_SYMBOL = "\u{1F508}";
const VERBOSITY_MEDIUM_SYMBOL = "\u{1F509}";
const VERBOSITY_HIGH_SYMBOL = "\u{1F50A}";

function getCodexStatusPrefix(
  provider: string | undefined,
  codexFastModeEnabled = false,
  codexVerbosity?: "low" | "medium" | "high",
): string {
  if (provider !== "openai-codex") return "";

  const parts: string[] = [];
  if (codexFastModeEnabled) parts.push(FAST_SYMBOL);
  if (codexVerbosity === "low") parts.push(VERBOSITY_LOW_SYMBOL);
  if (codexVerbosity === "medium") parts.push(VERBOSITY_MEDIUM_SYMBOL);
  if (codexVerbosity === "high") parts.push(VERBOSITY_HIGH_SYMBOL);

  return parts.length > 0 ? `${parts.join(" ")} ` : "";
}
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
  codexVerbosity?: "low" | "medium" | "high",
): string {
  const prefix = getCodexStatusPrefix(
    provider,
    codexFastModeEnabled,
    codexVerbosity,
  );
  const providerName = `${prefix}${provider ?? "unknown"}`;
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
  codexVerbosity?: "low" | "medium" | "high",
): string {
  const prefix = getCodexStatusPrefix(
    provider,
    codexFastModeEnabled,
    codexVerbosity,
  );
  return theme.fg("thinkingMinimal", `${prefix}${modelId ?? "no-model"}`);
}
