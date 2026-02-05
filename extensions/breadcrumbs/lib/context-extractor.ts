/**
 * Context extractor for handoff.
 *
 * Extracts mentioned/touched files from session content by scanning
 * tool calls for file operations (read, write, edit, etc.).
 */

import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

/**
 * Extract files mentioned or touched in the session content.
 *
 * Scans for:
 * - File paths in tool call arguments (path, file, filename params)
 * - Explicit file path patterns in conversation text
 *
 * Returns a deduplicated list of absolute file paths that exist on disk.
 */
export function extractMentionedFiles(
  sessionContent: string,
  cwd: string,
): string[] {
  const paths = new Set<string>();

  // Pattern 1: Tool call arguments with file paths
  // Matches: [Tool call: read(path: "/some/path")]
  // Matches: [Tool call: edit(path: "/some/path", ...)]
  const toolCallPattern = /\[Tool call: \w+\(([^)]*)\)\]/g;

  for (const match of sessionContent.matchAll(toolCallPattern)) {
    const argsStr = match[1];
    if (!argsStr) continue;

    // Extract path-like arguments
    const pathPattern = /(?:path|file|filename):\s*"([^"]+)"/g;
    for (const pathMatch of argsStr.matchAll(pathPattern)) {
      const filePath = pathMatch[1];
      if (filePath) {
        paths.add(filePath);
      }
    }
  }

  // Pattern 2: Explicit file paths in text
  // Match absolute paths starting with /
  const absolutePathPattern = /(?:^|\s|`)(\/(?:[\w.-]+\/)*[\w.-]+\.[\w]+)/gm;

  for (const match of sessionContent.matchAll(absolutePathPattern)) {
    const filePath = match[1];
    if (
      filePath &&
      !filePath.startsWith("/dev/") &&
      !filePath.startsWith("/proc/")
    ) {
      paths.add(filePath);
    }
  }

  // Pattern 3: Relative paths that look like source files
  const relativePathPattern =
    /(?:^|\s|`)((?:\.\/|[\w-]+\/)(?:[\w.-]+\/)*[\w.-]+\.(?:ts|js|tsx|jsx|json|md|yaml|yml|toml|css|html|py|rs|go|sh))/gm;

  for (const match of sessionContent.matchAll(relativePathPattern)) {
    const filePath = match[1];
    if (filePath) {
      paths.add(filePath);
    }
  }

  // Resolve to absolute paths and filter to existing files
  const resolved = new Set<string>();
  for (const p of paths) {
    const abs = isAbsolute(p) ? p : resolve(cwd, p);
    if (existsSync(abs)) {
      resolved.add(abs);
    }
  }

  return Array.from(resolved).sort();
}
