/**
 * Shell command formatting utilities.
 */

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function formatShellResult(
  command: string,
  result: { stdout: string; stderr: string; code: number },
): string {
  const chunks: string[] = [];
  const stdout = normalizeNewlines(result.stdout);
  const stderr = normalizeNewlines(result.stderr);
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
