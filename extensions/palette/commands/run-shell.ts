import type { PaletteCommand } from "../registry/types";
import { formatShellResult } from "../utils/shell";

export const shellWithContextCommand: PaletteCommand = {
  id: "shell.run",
  title: "Run shell command (!)",
  description: "Execute command and add output to context",
  keywords: ["bash", "shell", "command", "!"],
  group: "shell",

  async run(c, io) {
    const command = await io.input({
      title: "Shell command (!)",
      placeholder: "$ enter command",
    });
    if (!command) return;

    await executeShell(c, io, command, false);
  },
};

export const shellWithoutContextCommand: PaletteCommand = {
  id: "shell.run-excluded",
  title: "Run shell command (!!)",
  description: "Execute command without adding output to context",
  keywords: ["bash", "shell", "command", "!!", "no context"],
  group: "shell",

  async run(c, io) {
    const command = await io.input({
      title: "Shell command (!!)",
      placeholder: "$ enter command",
    });
    if (!command) return;

    await executeShell(c, io, command, true);
  },
};

async function executeShell(
  c: Parameters<PaletteCommand["run"]>[0],
  io: Parameters<PaletteCommand["run"]>[1],
  command: string,
  excludeFromContext: boolean,
): Promise<void> {
  try {
    const result = await c.pi.exec("sh", ["-lc", command], { cwd: c.ctx.cwd });
    const summary = formatShellResult(command, result);

    c.pi.sendMessage({
      customType: "palette:bash",
      content: excludeFromContext ? "" : summary,
      display: true,
      details: {
        command,
        exitCode: result.code,
        excluded: excludeFromContext,
        stdout: result.stdout,
        stderr: result.stderr,
      },
    });

    if (result.code !== 0) {
      const suffix = excludeFromContext ? " (excluded from context)" : "";
      io.notify(`Command failed (exit ${result.code})${suffix}`, "warning");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.notify(`Command execution failed: ${message}`, "error");
  }
}
