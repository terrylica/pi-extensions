/**
 * Prevent direct agent access to the sessions directory.
 *
 * Gates read, write, edit, and bash commands that target session files.
 * Agents should use find_sessions and read_session tools instead.
 */

import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import {
  Container,
  Key,
  matchesKey,
  Spacer,
  Text,
  wrapTextWithAnsi,
} from "@mariozechner/pi-tui";
import { AD_NOTIFY_ATTENTION_EVENT } from "../../../packages/events";

export type SessionReadAccessMode = "confirm" | "allow";

// In-memory mode for current Pi runtime only.
let sessionReadAccessMode: SessionReadAccessMode = "confirm";

export function getSessionReadAccessMode(): SessionReadAccessMode {
  return sessionReadAccessMode;
}

export function setSessionReadAccessMode(mode: SessionReadAccessMode): void {
  sessionReadAccessMode = mode;
}

export function toggleSessionReadAccessMode(): SessionReadAccessMode {
  sessionReadAccessMode =
    sessionReadAccessMode === "confirm" ? "allow" : "confirm";
  return sessionReadAccessMode;
}

function getSessionsDir(): string {
  const agentDir =
    process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
  return join(agentDir, "sessions");
}

/**
 * Check if a resolved absolute path falls within the sessions directory.
 */
function isInSessionsDir(path: string): boolean {
  const sessionsDir = getSessionsDir();
  const absolutePath = resolve(path);
  const rel = relative(sessionsDir, absolutePath);

  // Inside sessionsDir if the relative path does not escape via ".." and is not absolute.
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

const BLOCK_MESSAGE =
  "Direct access to session files is restricted. " +
  "Prefer find_sessions + read_session. " +
  "Direct reads may be allowed via runtime toggle or explicit user confirmation.";

const FILE_TOOLS = new Set(["read", "write", "edit"]);

function emitSessionGateEvent(
  pi: ExtensionAPI,
  description: string,
  command = "",
  toolName?: string,
  toolCallId?: string,
): void {
  const payload = {
    source: "breadcrumbs:protect-sessions-dir",
    command,
    description,
    toolName,
    toolCallId,
  };

  pi.events.emit(AD_NOTIFY_ATTENTION_EVENT, payload);
}

type SessionGateResult = "allow" | "allow-session" | "deny";

/**
 * Show a styled confirmation dialog for session file access.
 * Matches the pattern used by the modes extension tool gate.
 */
async function showSessionGateDialog(
  ctx: ExtensionContext,
  toolName: string,
  target: string,
  hintText: string,
): Promise<SessionGateResult> {
  const result = await ctx.ui.custom<SessionGateResult>(
    (_tui, theme, _kb, done) => {
      const container = new Container();
      const warnBorder = (s: string) => theme.fg("warning", s);

      container.addChild(new DynamicBorder(warnBorder));
      container.addChild(
        new Text(theme.fg("warning", theme.bold("Session File Access")), 1, 0),
      );
      container.addChild(new Spacer(1));
      container.addChild(
        new Text(
          theme.fg(
            "text",
            `The agent is trying to ${toolName} a session file directly.`,
          ),
          1,
          0,
        ),
      );
      container.addChild(new Spacer(1));

      container.addChild(
        new DynamicBorder((s: string) => theme.fg("muted", s)),
      );
      const targetText = new Text("", 1, 0);
      container.addChild(targetText);
      container.addChild(
        new DynamicBorder((s: string) => theme.fg("muted", s)),
      );

      container.addChild(new Spacer(1));
      container.addChild(
        new Text(
          theme.fg("muted", "Prefer find_sessions + read_session instead."),
          1,
          0,
        ),
      );
      container.addChild(new Spacer(1));
      container.addChild(new Text(theme.fg("dim", hintText), 1, 0));
      container.addChild(new DynamicBorder(warnBorder));

      return {
        render: (width: number) => {
          targetText.setText(
            wrapTextWithAnsi(theme.fg("text", target), width - 4).join("\n"),
          );
          return container.render(width);
        },
        invalidate: () => container.invalidate(),
        handleInput: (data: string) => {
          if (matchesKey(data, Key.enter) || data === "y" || data === "Y") {
            done("allow");
            return;
          }
          if (data === "a" || data === "A") {
            done("allow-session");
            return;
          }
          if (matchesKey(data, Key.escape) || data === "n" || data === "N") {
            done("deny");
          }
        },
      };
    },
  );

  if (result === undefined) return "deny";
  return result;
}

/**
 * Hook that gates direct file access to the sessions directory.
 *
 * Default behavior:
 * - read: prompt the user for confirmation via styled dialog. If no UI, deny.
 * - write/edit: blocked unconditionally.
 * - bash: prompt the user for confirmation via styled dialog. If no UI, deny.
 *
 * Optional runtime override:
 * - sessionReadAccessMode = "allow": all direct session-file reads are
 *   allowed for current runtime. Bash still requires per-command confirmation.
 */
export function setupProtectSessionsDirHook(pi: ExtensionAPI) {
  // Set of bash commands (full command string) approved for this session.
  const allowedBashCommands = new Set<string>();

  pi.on("tool_call", async (event, ctx) => {
    // File tools: check path / file_path parameter.
    if (FILE_TOOLS.has(event.toolName)) {
      const input = event.input as Record<string, unknown>;
      const rawPath = String(input.path ?? input.file_path ?? "");
      if (!rawPath) return;

      // Only gate when we can confidently resolve the path.
      // For non-absolute paths, we cannot resolve against the agent's cwd here,
      // so we keep the old safe behavior and block.
      const resolvedPath = isAbsolute(rawPath) ? resolve(rawPath) : null;

      if (resolvedPath && isInSessionsDir(resolvedPath)) {
        if (event.toolName !== "read") {
          emitSessionGateEvent(
            pi,
            `Blocked: direct session file ${event.toolName}`,
            resolvedPath,
            event.toolName,
            event.toolCallId,
          );
          return { block: true, reason: BLOCK_MESSAGE };
        }

        // read: allow all when runtime mode is "allow".
        if (getSessionReadAccessMode() === "allow") return;

        // In print/RPC mode, deny by default (safe fallback).
        if (!ctx.hasUI) {
          emitSessionGateEvent(
            pi,
            "Blocked: session file read requires confirmation, but no UI is available",
            resolvedPath,
            event.toolName,
            event.toolCallId,
          );
          return {
            block: true,
            reason:
              "Direct access to session files requires explicit user confirmation, but no UI is available.",
          };
        }

        emitSessionGateEvent(
          pi,
          "Confirmation required: direct session file read",
          resolvedPath,
          event.toolName,
          event.toolCallId,
        );

        const decision = await showSessionGateDialog(
          ctx,
          "read",
          resolvedPath,
          "y/enter: allow | a: allow all reads for session | n/esc: deny",
        );

        if (decision === "deny") {
          return { block: true, reason: "User denied session file read" };
        }

        if (decision === "allow-session") {
          // Allow all future session-file reads for this runtime
          setSessionReadAccessMode("allow");
        }

        return;
      }

      // If we can't confidently resolve, keep conservative behavior.
      // Note: isInSessionsDir() resolves paths internally; for relative paths we
      // don't know the correct base dir here, so treat these as suspicious.
      if (!resolvedPath && rawPath.includes("/.pi/agent/sessions")) {
        emitSessionGateEvent(
          pi,
          "Blocked: suspicious relative path into sessions dir",
          rawPath,
          event.toolName,
          event.toolCallId,
        );
        return { block: true, reason: BLOCK_MESSAGE };
      }

      return;
    }

    // Bash: check if command references sessions directory.
    if (event.toolName === "bash") {
      const command = String(event.input.command ?? "");
      const sessionsDir = getSessionsDir();

      if (
        command.includes(sessionsDir) ||
        command.includes("/.pi/agent/sessions")
      ) {
        // Allow all when runtime mode is "allow".
        if (getSessionReadAccessMode() === "allow") return;

        // Allow if previously approved for this session.
        if (allowedBashCommands.has(command)) return;

        // In print/RPC mode, deny by default (safe fallback).
        if (!ctx.hasUI) {
          emitSessionGateEvent(
            pi,
            "Blocked: session-dir bash requires confirmation, but no UI is available",
            command,
            event.toolName,
            event.toolCallId,
          );
          return {
            block: true,
            reason:
              "Bash commands targeting session files require explicit user confirmation, but no UI is available.",
          };
        }

        emitSessionGateEvent(
          pi,
          "Confirmation required: bash command targets sessions directory",
          command,
          event.toolName,
          event.toolCallId,
        );

        const decision = await showSessionGateDialog(
          ctx,
          "run bash on",
          command,
          "y/enter: allow | a: allow this command for session | n/esc: deny",
        );

        if (decision === "deny") {
          return { block: true, reason: "User denied session-dir bash" };
        }

        if (decision === "allow-session") {
          allowedBashCommands.add(command);
        }

        return;
      }
    }

    return;
  });
}
