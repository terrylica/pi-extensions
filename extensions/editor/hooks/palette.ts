/**
 * Register editor stash commands with the palette extension via EventBus.
 *
 * Emits "ad:palette:register" events immediately and re-emits when
 * the palette signals readiness (handles load-order differences).
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import {
  AD_EDITOR_STASH_CHANGED_EVENT,
  AD_PALETTE_READY_EVENT,
  AD_PALETTE_REGISTER_EVENT,
} from "../../../packages/events";
import { stashCount, stashPop, stashPush } from "../lib/stash";

function emitRegistrations(pi: ExtensionAPI): void {
  pi.events.emit(AD_PALETTE_REGISTER_EVENT, {
    id: "editor.stash",
    title: "Stash editor content",
    description: "Push editor text onto the stash and clear",
    keywords: ["stash", "save", "editor"],
    group: "editor",
    isEnabled: () => true,
    execute: async (ctx: ExtensionContext) => {
      const text = ctx.ui.getEditorText();
      if (!text) return;
      stashPush(text);
      ctx.ui.setEditorText("");
      ctx.ui.notify("stash: editor content stashed. ctrl+shift+r to restore");
      pi.events.emit(AD_EDITOR_STASH_CHANGED_EVENT, {
        count: stashCount(),
      });
    },
  });

  pi.events.emit(AD_PALETTE_REGISTER_EVENT, {
    id: "editor.unstash",
    title: "Unstash editor content",
    description: "Pop stashed text into editor (swaps if editor has content)",
    keywords: ["unstash", "restore", "pop", "editor"],
    group: "editor",
    isEnabled: () => {
      if (stashCount() === 0) {
        return { enabled: false, reason: "Stash is empty" };
      }
      return true;
    },
    execute: async (ctx: ExtensionContext) => {
      const popped = stashPop();
      if (popped === undefined) return;
      const current = ctx.ui.getEditorText();
      if (current) {
        stashPush(current);
        ctx.ui.notify("stash: swapped current editor content into stash");
      }
      ctx.ui.setEditorText(popped);
      pi.events.emit(AD_EDITOR_STASH_CHANGED_EVENT, {
        count: stashCount(),
      });
    },
  });
}

export function setupPaletteRegistration(pi: ExtensionAPI): void {
  emitRegistrations(pi);

  pi.events.on(AD_PALETTE_READY_EVENT, () => {
    emitRegistrations(pi);
  });
}
