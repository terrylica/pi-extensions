/**
 * Custom message renderers for palette-generated messages.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { Component } from "@mariozechner/pi-tui";
import { Box, Text } from "@mariozechner/pi-tui";

type Theme = ExtensionContext["ui"]["theme"];

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function renderBashMessage(
  message: { content: unknown; details?: unknown },
  expanded: boolean,
  theme: Theme,
): Component {
  const details =
    message.details && typeof message.details === "object"
      ? (message.details as Record<string, unknown>)
      : {};

  const command =
    typeof details.command === "string" && details.command.trim()
      ? details.command
      : "(unknown command)";
  const excluded = details.excluded === true;
  const exitCode =
    typeof details.exitCode === "number" ? details.exitCode : undefined;

  const stdout =
    typeof details.stdout === "string" ? normalizeNewlines(details.stdout) : "";
  const stderr =
    typeof details.stderr === "string" ? normalizeNewlines(details.stderr) : "";
  const combinedOutput = [stdout, stderr]
    .filter((x) => x.length > 0)
    .join("\n");

  const tag = theme.fg("customMessageLabel", theme.bold("[Shell]"));
  const statusBits: string[] = [];
  if (excluded) statusBits.push(theme.fg("dim", "!!"));
  if (exitCode && exitCode !== 0) {
    statusBits.push(theme.fg("warning", `exit ${exitCode}`));
  }
  const statusSuffix =
    statusBits.length > 0
      ? ` ${theme.fg("muted", `(${statusBits.join(" ")})`)}`
      : "";
  const header = `${tag} ${theme.bold("Ran")} \`${command}\`${statusSuffix}`;

  const box = new Box(1, 1, (t) => theme.bg("customMessageBg", t));
  const lines: string[] = [header];

  if (expanded) {
    const outputText =
      combinedOutput.length > 0
        ? combinedOutput
        : theme.fg("dim", "(no output)");
    lines.push(outputText);
    if (exitCode !== undefined && exitCode !== 0) {
      lines.push(theme.fg("warning", `Command exited with code ${exitCode}`));
    }
  }

  box.addChild(new Text(lines.join("\n"), 0, 0));
  return box;
}

export function registerRenderers(pi: ExtensionAPI): void {
  pi.registerMessageRenderer("palette:bash", (message, options, theme) => {
    return renderBashMessage(message, options.expanded, theme);
  });
}
