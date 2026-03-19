import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ToolCallHeader, ToolFooter } from "@aliou/pi-utils-ui";
import type {
  AgentToolResult,
  ExtensionAPI,
  ExtensionContext,
  Theme,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import { Container, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { showAndWait } from "./lib/glimpse";
import { wrapContent } from "./lib/shell";
import { buildDiffHTML } from "./lib/views/diff";
import { buildMarkdownHTML } from "./lib/views/markdown";

// ── Details types ───────────────────────────────────────────────────────

interface ShowDetails {
  response?: unknown;
  cachedPath?: string;
}

interface DiffDetails {
  oldLabel: string;
  newLabel: string;
  cachedPath?: string;
}

interface MarkdownDetails {
  length: number;
  cachedPath?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function errorResult<T>(err: unknown): AgentToolResult<T> {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text", text: `Glimpse error: ${msg}` }],
    details: {} as T,
  };
}

// ── Cache ────────────────────────────────────────────────────────────────

const CACHE_DIR = join(
  process.env.XDG_CACHE_HOME ?? join(process.env.HOME ?? "", ".cache"),
  "pi-glimpse",
);

function cacheHTML(html: string, prefix: string): string {
  mkdirSync(CACHE_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${prefix}-${ts}.html`;
  const filepath = join(CACHE_DIR, filename);
  writeFileSync(filepath, html);
  return filepath;
}

export default async function (pi: ExtensionAPI) {
  // ── glimpse_show ──────────────────────────────────────────────────────

  pi.registerTool<typeof ShowParams, ShowDetails>({
    name: "glimpse_show",
    label: "Glimpse",
    description:
      "Display HTML content in a native macOS window via tabs. Always blocking -- waits for user interaction or window close. " +
      "Each tab has a label and html content. The shell provides dark/light theme with curated color palettes, CSS utilities (.card, .btn, .btn-primary, .btn-danger, .code, .row, .col), and form styles. " +
      "Use send(data) from the HTML to return data to the agent. Escape key dismisses (returns null). " +
      "Optionally pass actions array to render a fixed bottom button bar for simple choices. " +
      "For custom interactive content (forms, selections), include buttons/inputs in the html that call send(). " +
      "Use for: visual content the terminal cannot render, collecting structured input, showing rich previews, interactive choices, multi-view displays.",
    parameters: ShowParams,

    async execute(
      _toolCallId: string,
      params: ShowParamsType,
      _signal: AbortSignal | undefined,
      _onUpdate: undefined,
      _ctx: ExtensionContext,
    ): Promise<AgentToolResult<ShowDetails>> {
      const { tabs, title, width, height, actions } = params;
      const fullHTML = wrapContent("", { actions, tabs });
      const cachedPath = cacheHTML(fullHTML, "show");

      try {
        const result = await showAndWait(fullHTML, {
          width: width ?? 600,
          height: height ?? 400,
          title: title ?? "Glimpse",
        });

        const text =
          result != null
            ? JSON.stringify(result)
            : "Window closed without response.";

        return {
          content: [{ type: "text", text }],
          details: { response: result ?? undefined, cachedPath },
        };
      } catch (err) {
        return errorResult(err);
      }
    },

    renderCall(args: ShowParamsType, theme: Theme) {
      return new ToolCallHeader(
        {
          toolName: "Glimpse",
          mainArg: args.title ?? args.tabs[0]?.label ?? "show",
          optionArgs: [
            {
              label: "size",
              value: `${args.width ?? 600}x${args.height ?? 400}`,
            },
            ...(args.tabs.length > 1
              ? [{ label: "tabs", value: `${args.tabs.length}` }]
              : []),
            ...(args.actions?.length
              ? [{ label: "actions", value: `${args.actions.length}` }]
              : []),
          ],
        },
        theme,
      );
    },

    renderResult(
      result: AgentToolResult<ShowDetails>,
      options: ToolRenderResultOptions,
      theme: Theme,
    ) {
      if (options.isPartial) {
        return new Text(theme.fg("muted", "Glimpse: waiting..."), 0, 0);
      }

      const details = result.details;
      const container = new Container();

      if (details?.response === undefined) {
        // Closed without response or error
        const textBlock = result.content.find((c) => c.type === "text");
        const msg =
          textBlock?.type === "text" ? textBlock.text : "Window closed";
        const isError = msg.startsWith("Glimpse error:");
        container.addChild(
          new Text(theme.fg(isError ? "error" : "muted", msg), 0, 0),
        );
      } else {
        const summary = JSON.stringify(details.response);
        const short =
          summary.length > 80 ? `${summary.slice(0, 77)}...` : summary;
        container.addChild(
          new Text(theme.fg("success", `Response: ${short}`), 0, 0),
        );
      }

      if (details?.cachedPath) {
        container.addChild(new Text("", 0, 0));
        container.addChild(
          new ToolFooter(theme, {
            items: [{ label: "cached", value: details.cachedPath }],
          }),
        );
      }

      return container;
    },
  });

  // ── glimpse_show_diff ─────────────────────────────────────────────────

  pi.registerTool<typeof DiffParams, DiffDetails>({
    name: "glimpse_show_diff",
    label: "Diff",
    description:
      "Display a side-by-side code diff in a native window. " +
      "Renders a syntax-highlighted diff view using diff2html. " +
      "Use for: reviewing code changes, comparing before/after implementations, showing proposed edits.",
    parameters: DiffParams,

    async execute(
      _toolCallId: string,
      params: DiffParamsType,
      _signal: AbortSignal | undefined,
      _onUpdate: undefined,
      _ctx: ExtensionContext,
    ): Promise<AgentToolResult<DiffDetails>> {
      const { old_code, new_code, language, old_label, new_label, title } =
        params;

      const oldLabel = old_label ?? "before";
      const newLabel = new_label ?? "after";

      const html = buildDiffHTML({
        oldCode: old_code,
        newCode: new_code,
        language,
        oldLabel,
        newLabel,
      });

      const cachedPath = cacheHTML(html, "diff");

      try {
        await showAndWait(html, {
          width: 900,
          height: 600,
          title: title ?? "Diff",
        });
        return {
          content: [{ type: "text", text: "Diff view closed." }],
          details: { oldLabel, newLabel, cachedPath },
        };
      } catch (err) {
        return errorResult(err);
      }
    },

    renderCall(args: DiffParamsType, theme: Theme) {
      const oldLabel = args.old_label ?? "before";
      const newLabel = args.new_label ?? "after";
      return new ToolCallHeader(
        {
          toolName: "Diff",
          mainArg: `${oldLabel} -> ${newLabel}`,
          optionArgs: args.language
            ? [{ label: "lang", value: args.language }]
            : [],
        },
        theme,
      );
    },

    renderResult(
      result: AgentToolResult<DiffDetails>,
      options: ToolRenderResultOptions,
      theme: Theme,
    ) {
      if (options.isPartial) {
        return new Text(theme.fg("muted", "Diff: loading..."), 0, 0);
      }

      const details = result.details;
      const container = new Container();

      if (!details?.oldLabel) {
        const textBlock = result.content.find((c) => c.type === "text");
        const msg = textBlock?.type === "text" ? textBlock.text : "Diff failed";
        container.addChild(new Text(theme.fg("error", msg), 0, 0));
      } else {
        container.addChild(
          new Text(theme.fg("muted", "Diff view closed."), 0, 0),
        );
      }

      if (details?.cachedPath) {
        container.addChild(new Text("", 0, 0));
        container.addChild(
          new ToolFooter(theme, {
            items: [{ label: "cached", value: details.cachedPath }],
          }),
        );
      }

      return container;
    },
  });

  // ── glimpse_show_markdown ─────────────────────────────────────────────

  pi.registerTool<typeof MarkdownParams, MarkdownDetails>({
    name: "glimpse_show_markdown",
    label: "Markdown",
    description:
      "Display rendered markdown in a native window with syntax-highlighted code blocks. " +
      "Use for: previewing generated docs, READMEs, formatted content, or any markdown the terminal renders poorly.",
    parameters: MarkdownParams,

    async execute(
      _toolCallId: string,
      params: MarkdownParamsType,
      _signal: AbortSignal | undefined,
      _onUpdate: undefined,
      _ctx: ExtensionContext,
    ): Promise<AgentToolResult<MarkdownDetails>> {
      const { markdown, title, width, height } = params;
      const html = buildMarkdownHTML({ markdown });
      const cachedPath = cacheHTML(html, "markdown");

      try {
        await showAndWait(html, {
          width: width ?? 700,
          height: height ?? 500,
          title: title ?? "Markdown",
        });
        return {
          content: [{ type: "text", text: "Markdown view closed." }],
          details: { length: markdown.length, cachedPath },
        };
      } catch (err) {
        return errorResult(err);
      }
    },

    renderCall(args: MarkdownParamsType, theme: Theme) {
      return new ToolCallHeader(
        {
          toolName: "Markdown",
          mainArg: args.title ?? "preview",
          optionArgs: [
            {
              label: "size",
              value: `${args.width ?? 700}x${args.height ?? 500}`,
            },
          ],
        },
        theme,
      );
    },

    renderResult(
      result: AgentToolResult<MarkdownDetails>,
      options: ToolRenderResultOptions,
      theme: Theme,
    ) {
      if (options.isPartial) {
        return new Text(theme.fg("muted", "Markdown: loading..."), 0, 0);
      }

      const details = result.details;
      const container = new Container();

      if (!details?.length) {
        const textBlock = result.content.find((c) => c.type === "text");
        const msg =
          textBlock?.type === "text" ? textBlock.text : "Markdown failed";
        container.addChild(new Text(theme.fg("error", msg), 0, 0));
      } else {
        container.addChild(
          new Text(
            theme.fg("muted", `Markdown view closed (${details.length} chars)`),
            0,
            0,
          ),
        );
      }

      if (details?.cachedPath) {
        container.addChild(new Text("", 0, 0));
        container.addChild(
          new ToolFooter(theme, {
            items: [{ label: "cached", value: details.cachedPath }],
          }),
        );
      }

      return container;
    },
  });
}

// ── Parameter schemas ───────────────────────────────────────────────────

const ShowParams = Type.Object({
  tabs: Type.Array(
    Type.Object({
      label: Type.String({ description: "Tab label" }),
      html: Type.String({ description: "HTML content for this tab" }),
    }),
    {
      minItems: 1,
      description: "Views rendered as tabs. Single tab = no tab bar.",
    },
  ),
  title: Type.Optional(Type.String({ description: "Window title" })),
  width: Type.Optional(
    Type.Number({ description: "Window width in pixels (default: 600)" }),
  ),
  height: Type.Optional(
    Type.Number({ description: "Window height in pixels (default: 400)" }),
  ),
  actions: Type.Optional(
    Type.Array(
      Type.Object({
        label: Type.String({ description: "Button label" }),
        value: Type.String({ description: "Value returned when clicked" }),
        style: Type.Optional(
          Type.Union([
            Type.Literal("primary"),
            Type.Literal("danger"),
            Type.Literal("default"),
          ]),
        ),
      }),
      { description: "Action buttons rendered in a fixed bottom bar" },
    ),
  ),
});

type ShowParamsType = {
  tabs: Array<{ label: string; html: string }>;
  title?: string;
  width?: number;
  height?: number;
  actions?: Array<{
    label: string;
    value: string;
    style?: "primary" | "danger" | "default";
  }>;
};

const DiffParams = Type.Object({
  old_code: Type.String({ description: "Original code" }),
  new_code: Type.String({ description: "Modified code" }),
  language: Type.Optional(
    Type.String({
      description: "Language for syntax highlighting (e.g. typescript, python)",
    }),
  ),
  old_label: Type.Optional(
    Type.String({
      description: "Label for original (e.g. filename or 'before')",
    }),
  ),
  new_label: Type.Optional(
    Type.String({
      description: "Label for modified (e.g. filename or 'after')",
    }),
  ),
  title: Type.Optional(Type.String({ description: "Window title" })),
});

type DiffParamsType = {
  old_code: string;
  new_code: string;
  language?: string;
  old_label?: string;
  new_label?: string;
  title?: string;
};

const MarkdownParams = Type.Object({
  markdown: Type.String({ description: "Markdown content to render" }),
  title: Type.Optional(Type.String({ description: "Window title" })),
  width: Type.Optional(
    Type.Number({ description: "Window width in pixels (default: 700)" }),
  ),
  height: Type.Optional(
    Type.Number({ description: "Window height in pixels (default: 500)" }),
  ),
});

type MarkdownParamsType = {
  markdown: string;
  title?: string;
  width?: number;
  height?: number;
};
