import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { CustomEditor } from "@mariozechner/pi-coding-agent";
import { restoreDefaultEditor } from "../../editor/hooks/editor";

class SubmitBridgeEditor extends CustomEditor {}

/**
 * Submit a real slash command through Pi's normal editor pipeline.
 *
 * This preserves the current editor draft, temporarily installs a custom
 * editor so we can access the wired onSubmit handler, submits the command,
 * then restores the default editor and puts the draft back into the active
 * editor (which may now belong to a newly-created session).
 */
export async function submitSlashCommandViaEditor(
  ctx: ExtensionContext,
  commandText: string,
): Promise<void> {
  if (!ctx.hasUI) {
    return;
  }

  const draft = ctx.ui.getEditorText();
  let editor: SubmitBridgeEditor | undefined;

  try {
    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      editor = new SubmitBridgeEditor(tui, theme, keybindings);
      return editor;
    });

    if (!editor) {
      ctx.ui.notify("Failed to create temporary editor", "error");
      return;
    }

    ctx.ui.setEditorText(commandText);

    if (typeof editor.onSubmit !== "function") {
      ctx.ui.notify("Failed to wire editor submit handler", "error");
      return;
    }

    await Promise.resolve(editor.onSubmit(commandText));
  } finally {
    restoreDefaultEditor(ctx);
    ctx.ui.setEditorText(draft);
  }
}
