/**
 * Shared constants for specialized subagents.
 */

/**
 * Provider priority for model resolution.
 * When a model is available from multiple providers, prefer in this order.
 */
export const PROVIDER_PRIORITY = [
  "opencode",
  "anthropic",
  "google",
  "openrouter",
] as const;

export type PriorityProvider = (typeof PROVIDER_PRIORITY)[number];
