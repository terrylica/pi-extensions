/**
 * Model resolution helper for subagents.
 */

import type { Model } from "@mariozechner/pi-ai";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { getProviderPriorityForModelId } from "./constants";

/**
 * Find a model by name from available providers.
 *
 * Searches providers in priority order (based on model family) and returns
 * the first matching model with a valid API key.
 *
 * @param modelName - Model ID to search for (e.g., "claude-haiku-4-5")
 * @param ctx - Extension context with modelRegistry
 * @returns The resolved model
 * @throws Error if no matching model found with valid API key
 */
export function resolveModel(
  modelName: string,
  ctx: ExtensionContext,
  // biome-ignore lint/suspicious/noExplicitAny: Model type requires any for generic API
): Model<any> {
  const available = ctx.modelRegistry.getAvailable();

  // Group matches by provider
  // biome-ignore lint/suspicious/noExplicitAny: Model type requires any for generic API
  const matchesByProvider = new Map<string, Model<any>>();
  for (const model of available) {
    if (model.id === modelName) {
      matchesByProvider.set(model.provider, model);
    }
  }

  if (matchesByProvider.size === 0) {
    // No match with API key - check if model exists at all
    const all = ctx.modelRegistry.getAll();
    const existsWithoutKey = all.some((m) => m.id === modelName);

    if (existsWithoutKey) {
      throw new Error(
        `Model "${modelName}" exists but no valid API key is configured for any provider offering it.`,
      );
    }
    throw new Error(
      `Model "${modelName}" not found in any configured provider.`,
    );
  }

  // Return first match by priority order (varies by model family)
  const providerPriority = getProviderPriorityForModelId(modelName);
  for (const provider of providerPriority) {
    const model = matchesByProvider.get(provider);
    if (model) {
      return model;
    }
  }

  // Fallback: return first match from any provider (handles providers not in priority list)
  const firstMatch = matchesByProvider.values().next().value;
  if (!firstMatch) {
    throw new Error(
      `Model "${modelName}" not found in any configured provider.`,
    );
  }
  return firstMatch;
}
