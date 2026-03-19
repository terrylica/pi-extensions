import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import {
  AD_PALETTE_READY_EVENT,
  AD_PALETTE_REGISTER_EVENT,
  AD_PROVIDERS_CODEX_FAST_MODE_CHANGED_EVENT,
  AD_PROVIDERS_CODEX_FAST_MODE_READY_EVENT,
  AD_PROVIDERS_CODEX_FAST_MODE_REQUEST_EVENT,
} from "../../../packages/events";
import {
  CODEX_FAST_ENTRY_TYPE,
  DEFAULT_CODEX_FAST_MODE_ENABLED,
  readCodexFastModeState,
} from "../lib/codex-fast-mode";

const PALETTE_REGISTER = AD_PALETTE_REGISTER_EVENT;
const CODEX_FAST_MODE_READY_EVENT = AD_PROVIDERS_CODEX_FAST_MODE_READY_EVENT;
const CODEX_FAST_MODE_REQUEST_EVENT =
  AD_PROVIDERS_CODEX_FAST_MODE_REQUEST_EVENT;
const CODEX_FAST_MODE_CHANGED_EVENT =
  AD_PROVIDERS_CODEX_FAST_MODE_CHANGED_EVENT;

let fastModeEnabled = DEFAULT_CODEX_FAST_MODE_ENABLED;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOpenAICodexProvider(ctx: ExtensionContext): boolean {
  return ctx.model?.provider === "openai-codex";
}

function emitFastModeState(pi: ExtensionAPI, ctx: ExtensionContext): void {
  pi.events.emit(CODEX_FAST_MODE_CHANGED_EVENT, {
    enabled: isOpenAICodexProvider(ctx) ? fastModeEnabled : false,
  });
}

function readFastModeState(ctx: ExtensionContext): boolean {
  return readCodexFastModeState(ctx);
}

function persistFastModeState(pi: ExtensionAPI, enabled: boolean): void {
  pi.appendEntry(CODEX_FAST_ENTRY_TYPE, { enabled });
}

function notifyFastModeState(ctx: ExtensionContext): void {
  if (!ctx.hasUI) return;

  if (!fastModeEnabled) {
    ctx.ui.notify(
      "Codex fast mode disabled. OpenAI Codex requests will use the default service tier.",
      "info",
    );
    return;
  }

  if (isOpenAICodexProvider(ctx)) {
    ctx.ui.notify(
      "Codex fast mode enabled. OpenAI Codex requests will send service_tier=priority.",
      "info",
    );
    return;
  }

  ctx.ui.notify(
    "Codex fast mode enabled. It will apply when you switch to an OpenAI Codex model.",
    "info",
  );
}

function setFastMode(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  enabled: boolean,
  options?: { notify?: boolean; persist?: boolean },
): void {
  fastModeEnabled = enabled;

  if (options?.persist !== false) {
    persistFastModeState(pi, enabled);
  }

  emitFastModeState(pi, ctx);

  if (options?.notify !== false) {
    notifyFastModeState(ctx);
  }
}

function emitPaletteRegistration(pi: ExtensionAPI): void {
  pi.events.emit(PALETTE_REGISTER, {
    id: "providers.codex-fast.toggle",
    title: "Toggle Codex fast mode",
    description: "Priority service tier",
    keywords: ["codex", "fast", "priority", "service tier", "providers"],
    group: "model",
    isEnabled: (c: { ctx: ExtensionContext }) => {
      if (c.ctx.model?.provider !== "openai-codex") {
        return {
          enabled: false,
          reason: "Requires a Codex model",
        };
      }

      return true;
    },
    execute: async (ctx: ExtensionContext) => {
      setFastMode(pi, ctx, !fastModeEnabled);
    },
  });
}

export function setupCodexFastModeHooks(pi: ExtensionAPI): void {
  emitPaletteRegistration(pi);
  pi.events.on(AD_PALETTE_READY_EVENT, () => {
    emitPaletteRegistration(pi);
  });

  pi.events.on(CODEX_FAST_MODE_REQUEST_EVENT, (data: unknown) => {
    const event = (data ?? {}) as { ctx?: ExtensionContext };
    if (!event.ctx) return;
    emitFastModeState(pi, event.ctx);
  });

  pi.on("session_start", async (_event, ctx) => {
    fastModeEnabled = readFastModeState(ctx);
    pi.events.emit(CODEX_FAST_MODE_READY_EVENT, {});
  });

  pi.on("session_switch", async (_event, ctx) => {
    fastModeEnabled = readFastModeState(ctx);
    pi.events.emit(CODEX_FAST_MODE_READY_EVENT, {});
  });

  pi.on("model_select", async (event, ctx) => {
    emitFastModeState(pi, ctx);

    if (!ctx.hasUI) return;
    if (event.source === "restore") return;
    if (event.model.provider !== "openai-codex") return;
    if (event.previousModel?.provider === "openai-codex") return;

    const suffix = fastModeEnabled ? " Fast mode is currently enabled." : "";
    ctx.ui.notify(
      `Codex fast mode and verbosity are available for this model from the palette.${suffix}`,
      "info",
    );
  });

  pi.on("before_provider_request", (event, ctx) => {
    if (
      !fastModeEnabled ||
      !isOpenAICodexProvider(ctx) ||
      !isRecord(event.payload)
    ) {
      return;
    }

    if (Object.hasOwn(event.payload, "service_tier")) {
      return;
    }

    return {
      ...event.payload,
      service_tier: "priority",
    };
  });
}
