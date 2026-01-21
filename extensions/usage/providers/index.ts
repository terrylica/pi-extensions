import type { AuthStorage } from "@mariozechner/pi-coding-agent";
import type { ProviderRateLimits } from "../types";
import { fetchClaudeRateLimits } from "./claude";
import { fetchCodexRateLimits } from "./codex";
import { fetchOpenCodeRateLimits } from "./opencode";

export async function fetchAllProviderRateLimits(
  authStorage: AuthStorage,
  signal?: AbortSignal,
): Promise<ProviderRateLimits[]> {
  const [claude, codex, opencode] = await Promise.all([
    fetchClaudeRateLimits(authStorage, signal),
    fetchCodexRateLimits(authStorage, signal),
    fetchOpenCodeRateLimits(signal),
  ]);
  return [claude, codex, opencode];
}
