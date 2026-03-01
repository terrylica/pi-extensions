import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { copyToClipboard } from "@mariozechner/pi-coding-agent";
import {
  getSessionReadAccessMode,
  setSessionReadAccessMode,
  toggleSessionReadAccessMode,
} from "../hooks/protect-sessions-dir";
import { setupContinueCommand } from "./continue";
import { setupHandoffCommand } from "./handoff";
import { setupSpawnCommand } from "./spawn";

type CommandHandler = Parameters<ExtensionAPI["registerCommand"]>[1]["handler"];

export function setupSessionCommands(pi: ExtensionAPI) {
  setupHandoffCommand(pi);
  setupContinueCommand(pi);
  setupSpawnCommand(pi);

  pi.registerCommand("session:copy-path", {
    description: "Copy the current session file path to clipboard",
    handler: async (_args, ctx) => {
      const sessionPath = ctx.sessionManager.getSessionFile();

      if (!sessionPath) {
        ctx.ui.notify("No session file (ephemeral session)", "warning");
        return;
      }

      copyToClipboard(sessionPath);
      ctx.ui.notify(sessionPath, "info");
    },
  });

  pi.registerCommand("session:copy-id", {
    description: "Copy the current session ID to clipboard",
    handler: async (_args, ctx) => {
      const sessionId = ctx.sessionManager.getSessionId();

      if (!sessionId) {
        ctx.ui.notify("No session ID (ephemeral session)", "warning");
        return;
      }

      copyToClipboard(sessionId);
      ctx.ui.notify(sessionId, "info");
    },
  });

  const handleReadSessionsAccessCommand: CommandHandler = async (args, ctx) => {
    const action = args.trim().toLowerCase();

    if (action === "status") {
      const mode = getSessionReadAccessMode();
      ctx.ui.notify(
        `Session-dir access mode: ${mode === "allow" ? "allow" : "confirm"}`,
        "info",
      );
      return;
    }

    if (["allow", "on", "enable"].includes(action)) {
      setSessionReadAccessMode("allow");
      ctx.ui.notify(
        "Session-dir direct reads + bash access allowed (runtime-only)",
        "warning",
      );
      return;
    }

    if (["confirm", "off", "disable"].includes(action)) {
      setSessionReadAccessMode("confirm");
      ctx.ui.notify("Session-dir access set to confirm mode", "info");
      return;
    }

    const mode = toggleSessionReadAccessMode();
    ctx.ui.notify(
      mode === "allow"
        ? "Session-dir direct reads + bash access allowed (runtime-only)"
        : "Session-dir access set to confirm mode",
      mode === "allow" ? "warning" : "info",
    );
  };

  pi.registerCommand("breadcrumbs:read-session-files", {
    description: "Toggle session-dir read + bash access for current runtime",
    handler: handleReadSessionsAccessCommand,
  });

  // Backward-compatible alias for muscle memory.
  pi.registerCommand("breadcrumb:read_session", {
    description:
      "Alias for breadcrumbs:read-session-files (runtime-only session-dir toggle)",
    handler: handleReadSessionsAccessCommand,
  });
}
