/**
 * Shell command formatting utilities.
 */

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences
const ansiRegex = /\u001b\[[0-9;]*m/g;

export function sanitizeShellOutput(text: string): string {
  return Array.from(normalizeNewlines(text).replace(ansiRegex, ""))
    .filter((char) => {
      const code = char.codePointAt(0);
      if (code === undefined) return false;

      if (code === 0x09 || code === 0x0a || code === 0x0d) return true;
      if (code <= 0x1f || code === 0x7f) return false;
      if (code >= 0xfff9 && code <= 0xfffb) return false;

      return true;
    })
    .join("");
}

export function formatShellResult(
  command: string,
  result: { stdout: string; stderr: string; code: number },
): string {
  const chunks: string[] = [];
  const stdout = sanitizeShellOutput(result.stdout);
  const stderr = sanitizeShellOutput(result.stderr);
  if (stdout) chunks.push(stdout);
  if (stderr) chunks.push(stderr);

  const combined = chunks.join("\n");
  const maxChars = 12000;
  const trimmed =
    combined.length > maxChars
      ? `${combined.slice(0, maxChars)}\n\n[output truncated]`
      : combined;

  let text = `Ran \`${command}\``;
  if (trimmed) {
    text += `\n${trimmed}`;
  } else {
    text += "\n(no output)";
  }
  if (result.code !== 0) {
    text += `\n\nCommand exited with code ${result.code}`;
  }
  return text;
}
