import { readFile } from "node:fs/promises";
import * as Diff from "diff";
import xxhash from "xxhash-wasm";

// 16-char dictionary for 2-char hash encoding
const DICT = "ZPMQVRWSNKTXJBYH";

// Lazy-init hasher
let hasherPromise: Promise<{
  h32: (input: string, seed?: number) => number;
}> | null = null;

async function getHasher() {
  if (!hasherPromise) {
    hasherPromise = xxhash();
  }
  return hasherPromise;
}

/**
 * Compute a 2-char hash for a line.
 * Uses xxHash32 of whitespace-normalized content, truncated to 8 bits.
 * Line number is mixed in as seed for symbol-only lines to avoid collisions.
 */
export async function computeLineHash(
  lineNumber: number,
  lineContent: string,
): Promise<string> {
  const hasher = await getHasher();
  const normalized = lineContent.replace(/\s+/g, "");
  // Mix line number for symbol-only lines (braces, brackets) to avoid collisions
  const seed = /[a-zA-Z0-9]/.test(normalized) ? 0 : lineNumber;
  const h = hasher.h32(normalized, seed) & 0xff;
  const c1 = DICT[h >> 4];
  const c2 = DICT[h & 0xf];
  if (!c1 || !c2) throw new Error("Hash dictionary index out of bounds");
  return c1 + c2;
}

/**
 * Prefix each line of file content with `LINE#HASH:` tags.
 * Lines are numbered starting from startLine (default 1).
 */
export async function addHashlineTags(
  text: string,
  startLine: number = 1,
): Promise<string> {
  const lines = text.split("\n");
  const taggedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = startLine + i;
    const lineContent = lines[i];
    if (lineContent === undefined) continue; // Should never happen
    const hash = await computeLineHash(lineNumber, lineContent);
    taggedLines.push(`${lineNumber}#${hash}:${lineContent}`);
  }

  return taggedLines.join("\n");
}

/** Parsed tag: line number and 2-char hash. */
export interface ParsedTag {
  line: number;
  hash: string;
}

/**
 * Parse a single tag like "5#KT" into { line: 5, hash: "KT" }.
 * Returns null if invalid format.
 */
export function parseTag(tag: string): ParsedTag | null {
  const match = /^(\d+)#([A-Z]{2})$/.exec(tag);
  if (!match) return null;
  const lineStr = match[1];
  const hash = match[2];
  if (!lineStr || !hash) return null;
  return { line: parseInt(lineStr, 10), hash };
}

/** Parsed target: single tag or range. */
export interface ParsedTarget {
  start: ParsedTag;
  end: ParsedTag; // Same as start for single-line targets
}

/**
 * Parse a target string into start/end tags.
 * Accepts single tag "5#KT" or range "5#KT-8#VR".
 */
export function parseTarget(target: string): ParsedTarget | null {
  const parts = target.split("-");
  if (parts.length === 1) {
    const part = parts[0];
    if (!part) return null;
    const tag = parseTag(part);
    if (!tag) return null;
    return { start: tag, end: tag };
  }
  if (parts.length === 2) {
    const part0 = parts[0];
    const part1 = parts[1];
    if (!part0 || !part1) return null;
    const start = parseTag(part0);
    const end = parseTag(part1);
    if (!start || !end) return null;
    if (start.line > end.line) return null; // Invalid range
    return { start, end };
  }
  return null;
}

/** Result of tag validation. */
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; correctedTags?: string; context?: string };

/**
 * Validate that tags match the current file content.
 * Recomputes hashes for all referenced lines.
 * On mismatch, returns corrected tags with surrounding context.
 */
export async function validateTags(
  fileLines: string[],
  edits: Array<{ target: string; op: string }>,
): Promise<ValidationResult> {
  const hasher = await getHasher();

  // Collect all line numbers we need to validate
  const lineNumbers = new Set<number>();
  for (const edit of edits) {
    const parsed = parseTarget(edit.target);
    if (!parsed) {
      return { valid: false, error: `Invalid target format: ${edit.target}` };
    }
    for (let line = parsed.start.line; line <= parsed.end.line; line++) {
      lineNumbers.add(line);
    }
  }

  // Compute hashes for all referenced lines
  const actualHashes = new Map<number, string>();
  for (const lineNum of lineNumbers) {
    const lineIndex = lineNum - 1; // Convert to 0-indexed
    if (lineIndex < 0 || lineIndex >= fileLines.length) {
      return {
        valid: false,
        error: `Line ${lineNum} is out of range (file has ${fileLines.length} lines)`,
      };
    }
    const lineContent = fileLines[lineIndex];
    if (lineContent === undefined) {
      return {
        valid: false,
        error: `Line ${lineNum} is out of range`,
      };
    }
    const normalized = lineContent.replace(/\s+/g, "");
    const seed = /[a-zA-Z0-9]/.test(normalized) ? 0 : lineNum;
    const h = hasher.h32(normalized, seed) & 0xff;
    const c1 = DICT[h >> 4];
    const c2 = DICT[h & 0xf];
    if (!c1 || !c2) {
      return { valid: false, error: "Hash computation failed" };
    }
    actualHashes.set(lineNum, c1 + c2);
  }

  // Validate each edit's tags
  for (const edit of edits) {
    const parsed = parseTarget(edit.target);
    if (!parsed) {
      return { valid: false, error: `Invalid target format: ${edit.target}` };
    }

    // Check start tag
    const actualStartHash = actualHashes.get(parsed.start.line);
    if (
      actualStartHash === undefined ||
      actualStartHash !== parsed.start.hash
    ) {
      const corrected = `${parsed.start.line}#${actualStartHash ?? "unknown"}`;
      const context = buildContext(fileLines, parsed.start.line);
      const targetParts = edit.target.split("-");
      const gotTag = targetParts[0] ?? edit.target;
      return {
        valid: false,
        error: `Stale tag at line ${parsed.start.line}. Expected ${corrected}, got ${gotTag}`,
        correctedTags: corrected,
        context,
      };
    }

    // Check end tag (if range)
    if (parsed.end.line !== parsed.start.line) {
      const actualEndHash = actualHashes.get(parsed.end.line);
      if (actualEndHash === undefined || actualEndHash !== parsed.end.hash) {
        const corrected = `${parsed.end.line}#${actualEndHash ?? "unknown"}`;
        const context = buildContext(fileLines, parsed.end.line);
        return {
          valid: false,
          error: `Stale tag at line ${parsed.end.line}. Expected ${corrected}`,
          correctedTags: corrected,
          context,
        };
      }
    }
  }

  return { valid: true };
}

/** Build context string around a line number. */
function buildContext(
  fileLines: string[],
  centerLine: number,
  radius: number = 2,
): string {
  const start = Math.max(1, centerLine - radius);
  const end = Math.min(fileLines.length, centerLine + radius);
  const lines: string[] = [];
  for (let i = start; i <= end; i++) {
    const marker = i === centerLine ? ">>>" : "   ";
    const line = fileLines[i - 1] ?? "";
    lines.push(`${marker} ${i}| ${line}`);
  }
  return lines.join("\n");
}

/** Edit operation. */
export interface EditOp {
  op: "replace" | "insert_after" | "insert_before" | "delete";
  target: ParsedTarget;
  content?: string[];
}

/**
 * Apply edits to file lines.
 * Sorts by line number descending (bottom-up) to preserve line numbers during application.
 */
export function applyEdits(fileLines: string[], edits: EditOp[]): string[] {
  // Convert to mutable array
  const lines = [...fileLines];

  // Sort by start line descending (bottom-up)
  const sortedEdits = [...edits].sort(
    (a, b) => b.target.start.line - a.target.start.line,
  );

  for (const edit of sortedEdits) {
    const { op, target, content } = edit;
    const startIdx = target.start.line - 1; // 0-indexed
    const endIdx = target.end.line - 1; // 0-indexed

    switch (op) {
      case "replace": {
        // Remove old lines, insert new content
        const deleteCount = endIdx - startIdx + 1;
        if (content) {
          lines.splice(startIdx, deleteCount, ...content);
        } else {
          lines.splice(startIdx, deleteCount);
        }
        break;
      }

      case "delete": {
        // Remove lines
        const deleteCount = endIdx - startIdx + 1;
        lines.splice(startIdx, deleteCount);
        break;
      }

      case "insert_after": {
        // Insert after the target line
        if (content) {
          lines.splice(startIdx + 1, 0, ...content);
        }
        break;
      }

      case "insert_before": {
        // Insert before the target line
        if (content) {
          lines.splice(startIdx, 0, ...content);
        }
        break;
      }
    }
  }

  return lines;
}

/**
 * Generate a diff string matching the native edit tool's format.
 * Returns the diff and the first changed line number.
 */
export function generateDiff(
  originalLines: string[],
  newLines: string[],
  _path: string,
): { diff: string; firstChangedLine: number | undefined } {
  const contextLines = 4;
  const oldContent = originalLines.join("\n");
  const newContent = newLines.join("\n");

  const parts = Diff.diffLines(oldContent, newContent);
  const output: string[] = [];

  const maxLineNum = Math.max(originalLines.length, newLines.length);
  const lineNumWidth = String(maxLineNum).length;

  let oldLineNum = 1;
  let newLineNum = 1;
  let lastWasChange = false;
  let firstChangedLine: number | undefined;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const raw = part.value.split("\n");
    // diffLines includes a trailing empty string from the final newline - strip it
    if (raw.length > 1 && raw[raw.length - 1] === "") raw.pop();

    if (part.added || part.removed) {
      if (firstChangedLine === undefined) firstChangedLine = newLineNum;

      for (const line of raw) {
        if (part.added) {
          output.push(
            `+${String(newLineNum).padStart(lineNumWidth, " ")} ${line}`,
          );
          newLineNum++;
        } else {
          output.push(
            `-${String(oldLineNum).padStart(lineNumWidth, " ")} ${line}`,
          );
          oldLineNum++;
        }
      }
      lastWasChange = true;
    } else {
      // Context lines
      const nextIsChange =
        i < parts.length - 1 && (parts[i + 1]?.added || parts[i + 1]?.removed);

      if (raw.length <= 2 * contextLines) {
        // Small context block: show entirely if adjacent to changes
        if (lastWasChange || nextIsChange) {
          for (const line of raw) {
            output.push(
              ` ${String(oldLineNum).padStart(lineNumWidth, " ")} ${line}`,
            );
            oldLineNum++;
            newLineNum++;
          }
        } else {
          oldLineNum += raw.length;
          newLineNum += raw.length;
        }
      } else {
        // Large context block: show trailing context from previous change,
        // separator, and leading context for next change
        if (lastWasChange) {
          const trailing = raw.slice(0, contextLines);
          for (const line of trailing) {
            output.push(
              ` ${String(oldLineNum).padStart(lineNumWidth, " ")} ${line}`,
            );
            oldLineNum++;
            newLineNum++;
          }
        }

        const alreadyShown = lastWasChange ? contextLines : 0;
        const willShow = nextIsChange ? contextLines : 0;
        const skipped = raw.length - alreadyShown - willShow;

        if (skipped > 0) {
          if (lastWasChange || nextIsChange) {
            output.push(` ${" ".padStart(lineNumWidth, " ")} ...`);
          }
          oldLineNum += skipped;
          newLineNum += skipped;
        }

        if (nextIsChange) {
          const leading = raw.slice(raw.length - contextLines);
          for (const line of leading) {
            output.push(
              ` ${String(oldLineNum).padStart(lineNumWidth, " ")} ${line}`,
            );
            oldLineNum++;
            newLineNum++;
          }
        }
      }

      lastWasChange = false;
    }
  }

  return { diff: output.join("\n"), firstChangedLine };
}

/** Read file lines. */
export async function readFileLines(path: string): Promise<string[]> {
  const content = await readFile(path, "utf-8");
  // Remove trailing newline if present for consistent line handling
  const normalized = content.endsWith("\n") ? content.slice(0, -1) : content;
  return normalized.split("\n");
}
