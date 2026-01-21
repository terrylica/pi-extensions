import type { Model } from "@mariozechner/pi-ai";
import type {
  AuthStorage,
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { fetchClaudeRateLimits } from "../providers/claude";
import { fetchCodexRateLimits } from "../providers/codex";
import type { ProviderRateLimits, RateLimitWindow } from "../types";
import { formatResetTime } from "../utils";

const WARNING_THRESHOLD = 60;

type ProviderKey = "anthropic" | "openai-codex";

/**
 * Tracks which windows have already shown warnings this session.
 * Key format: "provider:label" (e.g., "anthropic:Daily tokens")
 */
const warnedWindows = new Set<string>();

function getWindowKey(provider: string, label: string): string {
  return `${provider}:${label}`;
}

/**
 * Maps a model provider to the rate limit provider key.
 */
// biome-ignore lint/suspicious/noExplicitAny: Model type requires any for generic API
function getProviderKey(model: Model<any> | undefined): ProviderKey | null {
  if (!model) return null;
  const provider = model.provider.toLowerCase();
  if (provider === "anthropic") return "anthropic";
  if (provider === "openai-codex") return "openai-codex";
  return null;
}

/**
 * Fetches rate limits for a specific provider.
 */
async function fetchProviderRateLimits(
  providerKey: ProviderKey,
  authStorage: AuthStorage,
  signal?: AbortSignal,
): Promise<ProviderRateLimits | null> {
  switch (providerKey) {
    case "anthropic":
      return fetchClaudeRateLimits(authStorage, signal);
    case "openai-codex":
      return fetchCodexRateLimits(authStorage, signal);
    default:
      return null;
  }
}

/**
 * Finds windows that exceed the warning threshold and haven't been warned yet.
 */
function findNewHighUsageWindows(
  limits: ProviderRateLimits,
  skipAlreadyWarned: boolean,
): RateLimitWindow[] {
  if (limits.error || !limits.windows.length) return [];
  return limits.windows.filter((window) => {
    if (window.usedPercent < WARNING_THRESHOLD) return false;
    if (skipAlreadyWarned) {
      const key = getWindowKey(limits.provider, window.label);
      if (warnedWindows.has(key)) return false;
    }
    return true;
  });
}

/**
 * Marks windows as warned so they won't trigger again.
 */
function markWindowsAsWarned(
  provider: string,
  windows: RateLimitWindow[],
): void {
  for (const window of windows) {
    warnedWindows.add(getWindowKey(provider, window.label));
  }
}

/**
 * Formats the warning message for the notification.
 */
function formatWarningMessage(
  provider: string,
  windows: RateLimitWindow[],
): string {
  const lines = windows.map((w) => {
    const reset = formatResetTime(w.resetsAt);
    return `- ${w.label}: ${Math.round(w.usedPercent)}%, resets ${reset}`;
  });
  return `${provider} rate limit warning:\n${lines.join("\n")}`;
}

/**
 * Checks rate limits and shows a warning if above threshold.
 * This is fire-and-forget - does not block the caller.
 *
 * @param skipAlreadyWarned - If true, only warn for windows that haven't been warned yet.
 *                            If false, warn for all high usage windows (used on session start).
 */
async function checkAndWarnRateLimits(
  ctx: ExtensionContext,
  // biome-ignore lint/suspicious/noExplicitAny: Model type requires any for generic API
  model: Model<any> | undefined,
  skipAlreadyWarned: boolean,
): Promise<void> {
  if (!ctx.hasUI) return;

  const providerKey = getProviderKey(model);
  if (!providerKey) return;

  const authStorage = ctx.modelRegistry.authStorage;

  try {
    const limits = await fetchProviderRateLimits(providerKey, authStorage);
    if (!limits) return;

    // Verify model hasn't changed during the async check
    if (ctx.model !== model) return;

    const highUsageWindows = findNewHighUsageWindows(limits, skipAlreadyWarned);
    if (highUsageWindows.length === 0) return;

    // Mark these windows as warned before showing notification
    markWindowsAsWarned(limits.provider, highUsageWindows);

    const message = formatWarningMessage(limits.provider, highUsageWindows);

    // Determine severity: error if any window is >= 80%, warning otherwise
    const hasHighUsage = highUsageWindows.some((w) => w.usedPercent >= 80);
    ctx.ui.notify(message, hasHighUsage ? "error" : "warning");
  } catch {
    // Silently ignore errors - this is non-blocking and should not impact the user
  }
}

/**
 * Fire-and-forget wrapper that ensures the check is non-blocking.
 *
 * @param skipAlreadyWarned - If true, only warn for windows that haven't been warned yet.
 */
function triggerRateLimitCheck(
  ctx: ExtensionContext,
  // biome-ignore lint/suspicious/noExplicitAny: Model type requires any for generic API
  model: Model<any> | undefined,
  skipAlreadyWarned: boolean,
): void {
  // Do not await - this is intentionally fire-and-forget
  checkAndWarnRateLimits(ctx, model, skipAlreadyWarned).catch(() => {
    // Ignore errors
  });
}

export function setupRateLimitWarningHooks(pi: ExtensionAPI): void {
  // Check on session start - reset warned windows and show all high usage
  pi.on("session_start", async (_event, ctx) => {
    warnedWindows.clear();
    triggerRateLimitCheck(ctx, ctx.model, false);
  });

  // Check after agent turn - only warn for newly crossed thresholds
  pi.on("agent_end", async (_event, ctx) => {
    triggerRateLimitCheck(ctx, ctx.model, true);
  });

  // Check when model changes - reset for new provider, show all high usage
  pi.on("model_select", async (event, ctx) => {
    // Clear warnings since we're switching providers
    warnedWindows.clear();
    triggerRateLimitCheck(ctx, event.model, false);
  });
}
