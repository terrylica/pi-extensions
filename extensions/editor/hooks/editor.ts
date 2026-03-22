import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import {
  AD_EDITOR_BORDER_DECORATION_CHANGED_EVENT,
  AD_EDITOR_DRAFT_CHANGED_EVENT,
  AD_EDITOR_READY_EVENT,
  type AdEditorBorderDecorationChangedEvent,
  type BorderBand,
  type BorderSlot,
  type EditorBorderWrite,
  type ModeColor,
} from "../../../packages/events";
import {
  BorderEditor,
  type ResolvedBorderDecorations,
  type SlotState,
} from "../components/editor";

type SourceState = {
  seq: number;
  writes: EditorBorderWrite[];
};

let activeEditor: ReturnType<typeof createEditorRuntime> | undefined;

export function createEditorRuntime(pi: ExtensionAPI) {
  let editorRef: BorderEditor | undefined;
  const sourceStates = new Map<string, SourceState>();
  let sequence = 0;
  let lastScrollTop: number | undefined;
  let lastScrollBottom: number | undefined;

  const resolveDecorations = (): ResolvedBorderDecorations => {
    const entries = [...sourceStates.values()].sort((a, b) => a.seq - b.seq);

    const slots: Partial<Record<BorderSlot, SlotState>> = {};
    const bands: Partial<Record<BorderBand, { color: ModeColor }>> = {};

    for (const entry of entries) {
      for (const write of entry.writes) {
        if (write.kind === "slot") {
          slots[write.slot] = {
            text: write.text,
            color: write.color,
          };
          continue;
        }

        bands[write.band] = { color: write.color };
      }
    }

    return {
      slots,
      bands: {
        top: bands.top?.color,
        bottom: bands.bottom?.color,
      },
    };
  };

  const emitScrollWrites = (top?: number, bottom?: number) => {
    if (top === lastScrollTop && bottom === lastScrollBottom) {
      return;
    }

    lastScrollTop = top;
    lastScrollBottom = bottom;

    const writes: EditorBorderWrite[] = [];

    if (typeof top === "number") {
      writes.push({
        kind: "slot",
        slot: "top-end",
        text: `↑ ${top} more ───`,
      });
    }

    if (typeof bottom === "number") {
      writes.push({
        kind: "slot",
        slot: "bottom-end",
        text: `↓ ${bottom} more ───`,
      });
    }

    pi.events.emit(AD_EDITOR_BORDER_DECORATION_CHANGED_EVENT, {
      source: "editor:scroll",
      writes,
    } satisfies AdEditorBorderDecorationChangedEvent);
  };

  pi.events.on(AD_EDITOR_BORDER_DECORATION_CHANGED_EVENT, (data: unknown) => {
    const event = (data ?? {}) as Partial<AdEditorBorderDecorationChangedEvent>;
    if (typeof event.source !== "string" || !Array.isArray(event.writes)) {
      return;
    }

    sourceStates.set(event.source, {
      seq: ++sequence,
      writes: event.writes,
    });

    editorRef?.requestRenderNow();
  });

  return {
    setup: (ctx: ExtensionContext) => {
      if (!ctx.hasUI) {
        return;
      }

      ctx.ui.setEditorComponent((tui, theme, keybindings) => {
        const editor = new BorderEditor(tui, theme, keybindings);
        editor.appTheme = ctx.ui.theme;
        editor.getDecorations = resolveDecorations;
        editor.onDraftChanged = (text: string) => {
          pi.events.emit(AD_EDITOR_DRAFT_CHANGED_EVENT, { text });
        };
        editor.onScrollIndicators = (scroll) => {
          emitScrollWrites(scroll.top, scroll.bottom);
        };

        editorRef = editor;
        pi.events.emit(AD_EDITOR_READY_EVENT, {});
        pi.events.emit(AD_EDITOR_DRAFT_CHANGED_EVENT, {
          text: editor.getText(),
        });

        return editor;
      });
    },
    cleanup: () => {
      editorRef = undefined;
      sourceStates.clear();
      lastScrollTop = undefined;
      lastScrollBottom = undefined;
      sequence = 0;
    },
  };
}

export function setupEditorHook(pi: ExtensionAPI) {
  const runtime = createEditorRuntime(pi);
  activeEditor = runtime;

  pi.on("session_start", async (_event, ctx) => {
    runtime.setup(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    runtime.setup(ctx);
  });

  pi.on("session_shutdown", async () => {
    runtime.cleanup();
  });
}

export function restoreDefaultEditor(ctx: ExtensionContext): void {
  if (!ctx.hasUI) {
    return;
  }

  activeEditor?.setup(ctx);
}
