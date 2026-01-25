/**
 * Shared constants for specialized subagents.
 */

/**
 * Providers supported by the resolver.
 *
 * Note: This is just a resolver list. Actual availability depends on which
 * providers are configured in the user's model registry (API keys/OAuth).
 */
export const RESOLVER_PROVIDERS = [
  "opencode",
  "anthropic",
  "google",
  "openai-codex",
  "openrouter",
] as const;

export type ResolverProvider = (typeof RESOLVER_PROVIDERS)[number];

export type ModelFamily = "claude" | "gemini" | "gpt" | "unknown";

/**
 * Provider priority for model resolution, per model family.
 *
 * Goal:
 * - Prefer the "native"/mono provider first (Anthropic for Claude, Google for Gemini, Codex for GPT)
 * - Prefer the right multi-model aggregator as first fallback
 */
export const PROVIDER_PRIORITY_BY_FAMILY: Record<
  ModelFamily,
  readonly ResolverProvider[]
> = {
  claude: ["anthropic", "opencode", "openrouter"],
  gemini: ["google", "openrouter", "opencode"],
  gpt: ["openai-codex", "openrouter", "opencode"],
  // Default if we can't infer family.
  // Prefer mono providers first, then aggregators, then the remaining mono provider.
  unknown: ["anthropic", "openai-codex", "opencode", "openrouter", "google"],
} as const;

export function detectModelFamily(modelId: string): ModelFamily {
  const id = modelId.toLowerCase();

  // Claude
  if (id.includes("claude")) return "claude";

  // Gemini
  if (id.startsWith("gemini")) return "gemini";

  // GPT (Codex)
  if (id.startsWith("gpt-")) return "gpt";

  return "unknown";
}

export function getProviderPriorityForModelId(
  modelId: string,
): readonly ResolverProvider[] {
  return PROVIDER_PRIORITY_BY_FAMILY[detectModelFamily(modelId)];
}
