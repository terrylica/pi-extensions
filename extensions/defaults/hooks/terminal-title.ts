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

function setTitle(ctx: ExtensionContext, title: string) {
  if (!ctx.hasUI) return;
  ctx.ui.setTitle(title);
}

export function setupTerminalTitleHook(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    setTitle(ctx, `π: ${getContextName(ctx.cwd)}`);
  });

  pi.on("session_switch", async (_event, ctx) => {
    setTitle(ctx, `π: ${getContextName(ctx.cwd)}`);
  });

  pi.on("agent_start", async (_event, ctx) => {
    setTitle(ctx, `π: ${getContextName(ctx.cwd)} (thinking...)`);
  });

  pi.on("tool_call", async (event, ctx) => {
    setTitle(ctx, `π: ${getContextName(ctx.cwd)} (${event.toolName})`);
    return undefined;
  });

  pi.on("agent_end", async (_event, ctx) => {
    setTitle(ctx, `π: ${getContextName(ctx.cwd)}`);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    setTitle(ctx, "Terminal");
  });
}
