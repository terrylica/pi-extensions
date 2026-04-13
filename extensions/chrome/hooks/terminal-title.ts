/**
 * Terminal Title Hook
 *
 * Updates terminal title directly via UI API.
 * No session persistence for ephemeral title changes.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { AD_TERMINAL_TITLE_ATTENTION_EVENT } from "../../../packages/events";

const ATTENTION_MARKER = "[!]";

type TerminalTitleMode = "default" | "cmux";
// Maximum breadcrumb depth before truncation (root > ... > current)
const MAX_BREADCRUMB_DEPTH = 2;

// Markers that indicate a project root
const ROOT_MARKERS = [".git", ".root", "pnpm-workspace.yaml"];

/**
 * Find the project root by looking for root markers.
 * Returns null if no root found.
 */
function findProjectRoot(startDir: string): string | null {
  let currentDir = startDir;

  while (true) {
    for (const marker of ROOT_MARKERS) {
      const markerPath = path.join(currentDir, marker);
      try {
        if (fs.existsSync(markerPath)) {
          return currentDir;
        }
      } catch {
        // Continue checking other markers
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Get a friendly name for the current context.
 * Creates a breadcrumb from project root to current directory.
 * Truncates to 3 levels max: root > ... > current
 */
function getContextName(cwd: string): string {
  const projectRoot = findProjectRoot(cwd);

  if (!projectRoot) {
    return path.basename(cwd);
  }

  if (projectRoot === cwd) {
    return path.basename(projectRoot);
  }

  const relativePath = path.relative(projectRoot, cwd);
  const parts = relativePath.split(path.sep);
  const rootName = path.basename(projectRoot);

  if (parts.length <= MAX_BREADCRUMB_DEPTH) {
    return `${rootName} > ${parts.join(" > ")}`;
  }
  return `${rootName} > ... > ${parts[parts.length - 1]}`;
}

function detectTerminalTitleMode(
  env: NodeJS.ProcessEnv = process.env,
): TerminalTitleMode {
  if (env.CMUX_WORKSPACE_ID || env.CMUX_SURFACE_ID || env.CMUX_SOCKET_PATH) {
    return "cmux";
  }
  return "default";
}

export function formatTerminalTitle(
  cwd: string,
  detail?: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const mode = detectTerminalTitleMode(env);
  const trimmedDetail = detail?.trim();

  if (mode === "cmux") {
    return trimmedDetail ? `π: (${trimmedDetail})` : "π";
  }

  const contextName = getContextName(cwd);
  return trimmedDetail
    ? `π: ${contextName} (${trimmedDetail})`
    : `π: ${contextName}`;
}

function setTitle(ctx: ExtensionContext, title: string) {
  if (!ctx.hasUI) return;
  ctx.ui.setTitle(title);
}

function appendAttentionMarker(title: string): string {
  const trimmed = title.trimEnd();
  if (trimmed.endsWith(ATTENTION_MARKER)) return trimmed;
  return `${trimmed} ${ATTENTION_MARKER}`;
}

function removeAttentionMarker(title: string): string {
  const trimmed = title.trimEnd();
  if (trimmed.endsWith(` ${ATTENTION_MARKER}`)) {
    return trimmed.slice(0, -` ${ATTENTION_MARKER}`.length);
  }
  if (trimmed.endsWith(ATTENTION_MARKER)) {
    return trimmed.slice(0, -ATTENTION_MARKER.length).trimEnd();
  }
  return trimmed;
}

type AttentionTitleEvent = {
  action?: "start" | "end";
  toolCallId?: string;
  toolName?: string;
};

export function setupTerminalTitleHook(pi: ExtensionAPI) {
  let lastCtx: ExtensionContext | undefined;
  let currentBaseTitle = "Terminal";
  let globalAttentionCount = 0;
  const attentionToolCalls = new Set<string>();

  const hasAttention = (): boolean => {
    return globalAttentionCount > 0 || attentionToolCalls.size > 0;
  };

  const updateTitle = (ctx: ExtensionContext, baseTitle: string): void => {
    lastCtx = ctx;
    currentBaseTitle = removeAttentionMarker(baseTitle);
    const nextTitle = hasAttention()
      ? appendAttentionMarker(currentBaseTitle)
      : currentBaseTitle;

    setTitle(ctx, nextTitle);
  };

  pi.on("session_start", async (_event, ctx) => {
    updateTitle(ctx, formatTerminalTitle(ctx.cwd));
  });

  pi.on("agent_start", async (_event, ctx) => {
    updateTitle(ctx, formatTerminalTitle(ctx.cwd, "thinking..."));
  });

  pi.on("tool_call", async (event, ctx) => {
    updateTitle(ctx, formatTerminalTitle(ctx.cwd, event.toolName));
    return undefined;
  });

  pi.on("agent_end", async (_event, ctx) => {
    updateTitle(ctx, formatTerminalTitle(ctx.cwd));
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    updateTitle(ctx, "Terminal");
  });

  pi.events.on(AD_TERMINAL_TITLE_ATTENTION_EVENT, (data: unknown) => {
    const event = (data ?? {}) as AttentionTitleEvent;
    const action = event.action ?? "start";

    if (action === "end") {
      if (event.toolCallId) {
        attentionToolCalls.delete(event.toolCallId);
      } else {
        globalAttentionCount = Math.max(0, globalAttentionCount - 1);
      }
    } else {
      if (event.toolCallId) {
        attentionToolCalls.add(event.toolCallId);
      } else {
        globalAttentionCount++;
      }
    }

    if (!lastCtx) return;

    const baseTitle = event.toolName
      ? formatTerminalTitle(lastCtx.cwd, event.toolName)
      : currentBaseTitle;

    updateTitle(lastCtx, baseTitle);
  });
}
