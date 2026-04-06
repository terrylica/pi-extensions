import { CLAUDE_SYSTEM_PROMPT } from "./claude";
import { GLM_SYSTEM_PROMPT } from "./glm";
import { KIMI_SYSTEM_PROMPT } from "./kimi";
import { OPENAI_CODEX_SYSTEM_PROMPT } from "./openai-codex";

export type PromptFamily = "claude" | "openai-codex" | "kimi" | "glm";

export const PROMPT_FAMILY_MARKER = "<!-- PROMPT_FAMILY -->";

/** Change this single line to change the fallback family. */
export const DEFAULT_FAMILY: PromptFamily = "claude";

export interface ResolvedFamily {
  family: PromptFamily;
  /** True when the family is a fallback (provider/model didn't match any known family). */
  isDefault: boolean;
}

/**
 * Resolve a prompt family from the active model's provider and ID.
 *
 * Resolution order:
 * 1. Provider "openai-codex" or "openai" -> "openai-codex"
 * 2. Provider "anthropic" -> "claude"
 * 3. Model ID containing "kimi" (case-insensitive) -> "kimi"
 * 4. Model ID containing "glm" (case-insensitive) -> "glm"
 * 5. Everything else -> DEFAULT_FAMILY with isDefault: true
 */
export function resolvePromptFamily(
  provider?: string,
  modelId?: string,
): ResolvedFamily {
  if (provider === "openai-codex" || provider === "openai") {
    return { family: "openai-codex", isDefault: false };
  }
  if (provider === "anthropic") {
    return { family: "claude", isDefault: false };
  }
  if (modelId?.toLowerCase().includes("kimi")) {
    return { family: "kimi", isDefault: false };
  }
  if (modelId?.toLowerCase().includes("glm")) {
    return { family: "glm", isDefault: false };
  }
  return { family: DEFAULT_FAMILY, isDefault: true };
}

const FAMILY_PROMPTS: Record<PromptFamily, string> = {
  claude: CLAUDE_SYSTEM_PROMPT,
  "openai-codex": OPENAI_CODEX_SYSTEM_PROMPT,
  kimi: KIMI_SYSTEM_PROMPT,
  glm: GLM_SYSTEM_PROMPT,
};

export function getPromptForFamily(family: PromptFamily): string {
  return FAMILY_PROMPTS[family];
}
