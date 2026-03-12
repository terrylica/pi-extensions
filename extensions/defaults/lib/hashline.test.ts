import { describe, expect, it } from "vitest";
import { generateDiff } from "./hashline";

/**
 * Helper to create an array of lines like ["line 1", "line 2", ...].
 */
function makeLines(count: number, prefix = "line"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
}

describe("generateDiff", () => {
  it("returns empty diff for identical content", () => {
    const lines = ["a", "b", "c"];
    const result = generateDiff(lines, [...lines], "test.ts");
    expect(result.diff).toBe("");
    expect(result.firstChangedLine).toBeUndefined();
  });

  it("shows a single-line change with context", () => {
    const original = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const modified = ["a", "b", "c", "CHANGED", "e", "f", "g", "h"];
    const result = generateDiff(original, modified, "test.ts");

    expect(result.firstChangedLine).toBe(4);

    const lines = result.diff.split("\n");
    // Should have context before the change
    expect(lines.some((l) => l.includes("a"))).toBe(true);
    // Should have the removal and addition
    expect(lines.some((l) => l.startsWith("-") && l.includes("d"))).toBe(true);
    expect(lines.some((l) => l.startsWith("+") && l.includes("CHANGED"))).toBe(
      true,
    );
    // Should have context after the change
    expect(lines.some((l) => l.includes("e"))).toBe(true);
  });

  it("produces separate hunks for distant changes with ... separator", () => {
    // 20 lines, change line 1 and line 20
    const original = makeLines(20);
    const modified = [...original];
    modified[0] = "CHANGED 1";
    modified[19] = "CHANGED 20";

    const result = generateDiff(original, modified, "test.ts");

    expect(result.firstChangedLine).toBe(1);

    const lines = result.diff.split("\n");
    // Should contain a ... separator between the two hunks
    expect(lines.some((l) => l.includes("..."))).toBe(true);

    // Should contain both changes
    expect(
      lines.some((l) => l.startsWith("+") && l.includes("CHANGED 1")),
    ).toBe(true);
    expect(
      lines.some((l) => l.startsWith("+") && l.includes("CHANGED 20")),
    ).toBe(true);

    // Should NOT contain all 20 lines of context between changes
    // With 4 context lines, we should see trailing context from hunk 1 and leading context from hunk 2,
    // but not the middle lines
    const contextLineNumbers = lines
      .filter((l) => l.startsWith(" "))
      .map((l) => l.trim())
      .filter((l) => !l.startsWith("..."));

    // The gap between line 5 (end of first hunk context) and line 16 (start of second hunk context)
    // should not appear
    expect(contextLineNumbers.some((l) => l.includes("line 10"))).toBe(false);
  });

  it("merges nearby changes into a single hunk", () => {
    // Two changes within 8 lines of each other (within 2*contextLines)
    const original = makeLines(15);
    const modified = [...original];
    modified[2] = "CHANGED 3";
    modified[6] = "CHANGED 7";

    const result = generateDiff(original, modified, "test.ts");

    const lines = result.diff.split("\n");
    // Should NOT contain a ... separator - changes are close enough to be one hunk
    const separators = lines.filter((l) => l.includes("..."));
    expect(separators).toHaveLength(0);

    // Both changes should be present
    expect(
      lines.some((l) => l.startsWith("+") && l.includes("CHANGED 3")),
    ).toBe(true);
    expect(
      lines.some((l) => l.startsWith("+") && l.includes("CHANGED 7")),
    ).toBe(true);
  });

  it("handles added lines", () => {
    const original = ["a", "b", "c"];
    const modified = ["a", "b", "NEW", "c"];
    const result = generateDiff(original, modified, "test.ts");

    const lines = result.diff.split("\n");
    expect(lines.some((l) => l.startsWith("+") && l.includes("NEW"))).toBe(
      true,
    );
  });

  it("handles deleted lines", () => {
    const original = ["a", "b", "c", "d"];
    const modified = ["a", "c", "d"];
    const result = generateDiff(original, modified, "test.ts");

    const lines = result.diff.split("\n");
    expect(lines.some((l) => l.startsWith("-") && l.includes("b"))).toBe(true);
  });

  it("handles empty original (all lines added)", () => {
    const original: string[] = [];
    const modified = ["a", "b", "c"];
    const result = generateDiff(original, modified, "test.ts");

    expect(result.firstChangedLine).toBe(1);
    const lines = result.diff.split("\n");
    expect(lines.filter((l) => l.startsWith("+"))).toHaveLength(3);
  });

  it("handles empty result (all lines removed)", () => {
    const original = ["a", "b", "c"];
    const modified: string[] = [];
    const result = generateDiff(original, modified, "test.ts");

    expect(result.firstChangedLine).toBe(1);
    const lines = result.diff.split("\n");
    expect(lines.filter((l) => l.startsWith("-"))).toHaveLength(3);
  });

  it("uses correct line number width for large files", () => {
    const original = makeLines(100);
    const modified = [...original];
    modified[0] = "CHANGED";

    const result = generateDiff(original, modified, "test.ts");

    const lines = result.diff.split("\n");
    // Line numbers should be padded to 3 digits (100 lines)
    const addedLine = lines.find((l) => l.startsWith("+"));
    expect(addedLine).toMatch(/^\+\s+1\s/);
  });

  it("diff lines use correct prefixes", () => {
    const original = ["context", "old", "context2"];
    const modified = ["context", "new", "context2"];
    const result = generateDiff(original, modified, "test.ts");

    const lines = result.diff.split("\n");
    for (const line of lines) {
      // Every line should start with +, -, or space
      expect(line).toMatch(/^[+ -]/);
    }
  });
});
