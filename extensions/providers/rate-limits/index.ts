import type { AuthStorage } from "@mariozechner/pi-coding-agent";
import type { ProviderRateLimits } from "../types";
import { fetchClaudeRateLimits } from "./claude";
import { fetchCodexRateLimits } from "./codex";
import { fetchSyntheticRateLimits } from "./synthetic";

export async function fetchAllProviderRateLimits(
  authStorage: AuthStorage,
  signal?: AbortSignal,
): Promise<ProviderRateLimits[]> {
  const [claude, codex, synthetic] = await Promise.all([
    fetchClaudeRateLimits(authStorage, signal),
    fetchCodexRateLimits(authStorage, signal),
    fetchSyntheticRateLimits(signal),
  ]);

  return [claude, codex, synthetic];
}

export type {
  RiskAssessment,
  RiskSeverity,
  WindowProjection,
} from "./projection";
// Export projection/risk assessment utilities
export {
  assessWindowRisk,
  getPacePercent,
  getProjectedPercent,
  getSeverityColor,
  inferWindowSeconds,
} from "./projection";
