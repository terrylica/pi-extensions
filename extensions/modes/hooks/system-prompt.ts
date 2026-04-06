import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  DEFAULT_FAMILY,
  getPromptForFamily,
  PROMPT_FAMILY_MARKER,
  resolvePromptFamily,
} from "../lib/prompt-families";
import { getCurrentMode } from "../state";

/**
 * Extract the "Available tools:" through end of "Guidelines:" sections
 * from pi's base prompt. Returns empty string if markers not found.
 *
 * Pi's default prompt structure above the APPEND_SYSTEM marker:
 *   You are an expert coding assistant...
 *   \nAvailable tools:\n...
 *   \nGuidelines:\n...
 *   \nPi documentation...\n...
 *
 * We extract from "\nAvailable tools:\n" up to "\nPi documentation".
 * If "\nPi documentation" is not found, extract to end of aboveMarker.
 */
function extractToolsAndGuidelines(aboveMarker: string): string {
  const toolsStart = aboveMarker.indexOf("\nAvailable tools:\n");
  if (toolsStart === -1) return "";

  const piDocsStart = aboveMarker.indexOf("\nPi documentation");
  const end = piDocsStart !== -1 ? piDocsStart : aboveMarker.length;

  return aboveMarker.slice(toolsStart, end).trim();
}

/** Tracks providers we've already warned about for default-family fallback. */
const warnedProviders = new Set<string>();

export function setupSystemPromptHook(pi: ExtensionAPI): void {
  pi.on("before_agent_start", async (event, ctx) => {
    const mode = getCurrentMode();

    // If marker not found, skip family replacement -- just append mode instructions.
    if (!event.systemPrompt.includes(PROMPT_FAMILY_MARKER)) {
      if (!mode.instructions) return;
      return {
        systemPrompt: `${event.systemPrompt}\n\n${mode.instructions}`,
      };
    }

    // Resolve family from current model
    const { family, isDefault } = resolvePromptFamily(
      ctx.model?.provider,
      ctx.model?.id,
    );

    if (
      isDefault &&
      ctx.model?.provider &&
      !warnedProviders.has(ctx.model.provider)
    ) {
      warnedProviders.add(ctx.model.provider);
      ctx.ui.notify(
        `No prompt family for ${ctx.model.provider}, using ${DEFAULT_FAMILY}`,
        "warning",
      );
    }

    // Split at marker
    const markerIdx = event.systemPrompt.indexOf(PROMPT_FAMILY_MARKER);
    const aboveMarker = event.systemPrompt.slice(0, markerIdx);
    const belowMarker = event.systemPrompt.slice(
      markerIdx + PROMPT_FAMILY_MARKER.length,
    );

    // Extract tools + guidelines from pi's base prompt
    const toolsAndGuidelines = extractToolsAndGuidelines(aboveMarker);

    // Choose base prompt: mode instructions replace family prompt.
    // Family prompt is used only when no mode instructions exist.
    const basePrompt = mode.instructions
      ? mode.instructions
      : getPromptForFamily(family);

    const parts = [basePrompt];
    if (toolsAndGuidelines) {
      parts.push(toolsAndGuidelines);
    }
    parts.push(belowMarker.trimStart());

    const systemPrompt = parts.join("\n\n");

    return { systemPrompt };
  });
}
