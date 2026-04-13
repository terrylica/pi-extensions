import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { AD_EDITOR_STASH_CHANGED_EVENT } from "../../../packages/events";
import { stashCount, stashPop, stashPush } from "../lib/stash";

export function registerStashCommands(pi: ExtensionAPI) {
  pi.registerCommand("stash", {
    description: "Stash editor content",
    handler: async (_args, ctx) => {
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

  pi.registerCommand("unstash", {
    description: "Pop stashed editor content (swaps if editor has content)",
    handler: async (_args, ctx) => {
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
