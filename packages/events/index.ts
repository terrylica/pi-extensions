export const AD_NOTIFY_DANGEROUS_EVENT = "ad:notify:dangerous";
export const AD_NOTIFY_ATTENTION_EVENT = "ad:notify:attention";
export const AD_NOTIFY_DONE_EVENT = "ad:notify:done";

export const AD_TERMINAL_TITLE_ATTENTION_EVENT = "ad:terminal-title:attention";

export const AD_PALETTE_REGISTER_EVENT = "ad:palette:register";
export const AD_PALETTE_READY_EVENT = "ad:palette:ready";

export const AD_PROVIDERS_CODEX_FAST_MODE_READY_EVENT =
  "ad:providers:codex-fast-mode:ready";
export const AD_PROVIDERS_CODEX_FAST_MODE_REQUEST_EVENT =
  "ad:providers:codex-fast-mode:request";
export const AD_PROVIDERS_CODEX_FAST_MODE_CHANGED_EVENT =
  "ad:providers:codex-fast-mode:changed";

export type AdProvidersCodexFastModeChangedEvent = {
  enabled: boolean;
};

export const AD_PROVIDERS_CODEX_VERBOSITY_READY_EVENT =
  "ad:providers:codex-verbosity:ready";
export const AD_PROVIDERS_CODEX_VERBOSITY_REQUEST_EVENT =
  "ad:providers:codex-verbosity:request";
export const AD_PROVIDERS_CODEX_VERBOSITY_CHANGED_EVENT =
  "ad:providers:codex-verbosity:changed";

export type AdProvidersCodexVerbosityChangedEvent = {
  verbosity?: "low" | "medium" | "high";
};
