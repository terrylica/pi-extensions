import type { PaletteCommand } from "../registry/types";
import { formatShellResult, sanitizeShellOutput } from "../utils/shell";

export const shellWithContextCommand: PaletteCommand = {
  id: "shell.run",
  title: "Run shell command (!)",
  description: "Add output to context",
  keywords: ["bash", "shell", "command", "!"],
  group: "shell",

  async run(c, io) {
    const command = await io.input({
      title: "Shell command (!)",
      placeholder: "$ enter command",
    });
    if (!command) return;

    await executeShell(c, command, false);
  },
};

export const shellWithoutContextCommand: PaletteCommand = {
  id: "shell.run-excluded",
  title: "Run shell command (!!)",
  description: "Exclude from context",
  keywords: ["bash", "shell", "command", "!!", "no context"],
  group: "shell",

  async run(c, io) {
    const command = await io.input({
      title: "Shell command (!!)",
      placeholder: "$ enter command",
    });
    if (!command) return;

    await executeShell(c, command, true);
  },
};

async function executeShell(
  c: Parameters<PaletteCommand["run"]>[0],
  command: string,
  excludeFromContext: boolean,
): Promise<void> {
  try {
    const result = await c.pi.exec("sh", ["-lc", command], { cwd: c.ctx.cwd });
    const sanitizedStdout = sanitizeShellOutput(result.stdout);
    const sanitizedStderr = sanitizeShellOutput(result.stderr);
    const sanitizedResult = {
      ...result,
      stdout: sanitizedStdout,
      stderr: sanitizedStderr,
    };
    const summary = formatShellResult(command, sanitizedResult);

    if (!excludeFromContext && result.code !== 0) {
      const output = [sanitizedStdout, sanitizedStderr]
        .filter((chunk) => chunk.length > 0)
        .join("\n");
      const maxChars = 4000;
      const trimmedOutput =
        output.length > maxChars
          ? `${output.slice(0, maxChars)}\n\n[output truncated]`
          : output || "(no output)";

      c.ctx.ui.notify(
        `Command failed (exit ${result.code})\n${trimmedOutput}`,
        "error",
      );
      return;
    }

    c.pi.sendMessage({
      customType: "palette:bash",
      content: excludeFromContext ? "" : summary,
      display: true,
      details: {
        command,
        exitCode: result.code,
        excluded: excludeFromContext,
        stdout: sanitizedStdout,
        stderr: sanitizedStderr,
      },
    });

    if (result.code !== 0) {
      c.ctx.ui.notify(
        `Command failed (exit ${result.code})${excludeFromContext ? " (excluded from context)" : ""}`,
        "error",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    c.ctx.ui.notify(`Command execution failed: ${message}`, "error");
  }
}
