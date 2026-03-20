import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { stashPop, stashPush } from "../lib/editor-stash";

export const AD_DEFAULTS_STASH_CHANGED_EVENT = "ad:defaults:stash-changed";

export function setupEditorStashHook(pi: ExtensionAPI) {
  pi.registerShortcut("ctrl+shift+s", {
    description: "Stash editor content",
    handler: async (ctx) => {
      const text = ctx.ui.getEditorText();
      if (!text) return;
      stashPush(text);
      ctx.ui.setEditorText("");
      ctx.ui.notify("stash: editor content stashed. ctrl+shift+r to restore");
      pi.events.emit(AD_DEFAULTS_STASH_CHANGED_EVENT, {});
    },
  });

  pi.registerShortcut("ctrl+shift+r", {
    description: "Pop stashed editor content (swaps if editor has content)",
    handler: async (ctx) => {
      const popped = stashPop();
      if (popped === undefined) return;
      const current = ctx.ui.getEditorText();
      if (current) {
        stashPush(current);
        ctx.ui.notify("stash: swapped current editor content into stash");
      }
      ctx.ui.setEditorText(popped);
      pi.events.emit(AD_DEFAULTS_STASH_CHANGED_EVENT, {});
    },
  });
}
