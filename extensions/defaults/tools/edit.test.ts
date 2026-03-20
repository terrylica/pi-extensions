import { mkdtempSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPiTestHarness } from "../../../tests/utils/pi-test-harness";
import { setupEditTool } from "./edit";

describe("defaults edit tool", () => {
  const dirs: string[] = [];

  async function makeHarness(initial: string, fileName = "file.txt") {
    const dir = mkdtempSync(join(tmpdir(), "edit-test-"));
    dirs.push(dir);
    await writeFile(join(dir, fileName), initial, "utf-8");
    const pi = await createPiTestHarness(setupEditTool, { cwd: dir });
    return { dir, pi, filePath: join(dir, fileName), fileName };
  }

  afterEach(async () => {
    await Promise.all(
      dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it("does single replace", async () => {
    const { pi, filePath, fileName } = await makeHarness("one\ntwo\nthree\n");

    const result = (await pi.tool("edit").execute({
      path: fileName,
      oldText: "two",
      newText: "TWO",
    })) as {
      content: Array<{ type: string; text: string }>;
      details: { diff: string };
    };

    await expect(readFile(filePath, "utf-8")).resolves.toBe(
      "one\nTWO\nthree\n",
    );
    expect(result.content[0]?.text).toContain(
      `Successfully replaced text in ${fileName}.`,
    );
    expect(result.details.diff).toContain("+2 TWO");
  });

  it("does multi replace", async () => {
    const { pi, filePath, fileName } = await makeHarness(
      "alpha\nbeta\ngamma\ndelta\n",
    );

    const result = (await pi.tool("edit").execute({
      path: fileName,
      edits: [
        { oldText: "beta", newText: "BETA" },
        { oldText: "delta", newText: "DELTA" },
      ],
    })) as {
      content: Array<{ type: string; text: string }>;
      details: { diff: string };
    };

    await expect(readFile(filePath, "utf-8")).resolves.toBe(
      "alpha\nBETA\ngamma\nDELTA\n",
    );
    expect(result.content[0]?.text).toContain(
      `Successfully replaced 2 block(s) in ${fileName}.`,
    );
    expect(result.details.diff).toContain("+2 BETA");
    expect(result.details.diff).toContain("+4 DELTA");
  });

  it("keeps fuzzy matching", async () => {
    const { pi, filePath, fileName } = await makeHarness(
      "const title = “hello”;\n",
    );

    await pi.tool("edit").execute({
      path: fileName,
      oldText: 'const title = "hello";',
      newText: 'const title = "world";',
    });

    await expect(readFile(filePath, "utf-8")).resolves.toBe(
      'const title = "world";\n',
    );
  });

  it("preserves CRLF", async () => {
    const { pi, filePath, fileName } = await makeHarness("a\r\nb\r\nc\r\n");

    await pi.tool("edit").execute({
      path: fileName,
      edits: [{ oldText: "b", newText: "B" }],
    });

    await expect(readFile(filePath, "utf-8")).resolves.toBe("a\r\nB\r\nc\r\n");
  });

  it("preserves BOM", async () => {
    const { pi, filePath, fileName } = await makeHarness("\uFEFFalpha\nbeta\n");

    await pi.tool("edit").execute({
      path: fileName,
      edits: [{ oldText: "beta", newText: "BETA" }],
    });

    await expect(readFile(filePath, "utf-8")).resolves.toBe(
      "\uFEFFalpha\nBETA\n",
    );
  });

  it("rejects mixed single and multi mode", async () => {
    const { pi, fileName } = await makeHarness("one\ntwo\n");

    await expect(
      pi.tool("edit").execute({
        path: fileName,
        oldText: "one",
        newText: "ONE",
        edits: [{ oldText: "two", newText: "TWO" }],
      }),
    ).rejects.toThrow(/either edits or single replacement mode/i);
  });

  it("rejects non-unique multi edit matches", async () => {
    const { pi, fileName } = await makeHarness("same\nother\nsame\n");

    await expect(
      pi.tool("edit").execute({
        path: fileName,
        edits: [{ oldText: "same", newText: "SAME" }],
      }),
    ).rejects.toThrow(/must be unique/i);
  });

  it("rejects overlapping multi edits", async () => {
    const { pi, fileName } = await makeHarness("abcdef\n");

    await expect(
      pi.tool("edit").execute({
        path: fileName,
        edits: [
          { oldText: "abc", newText: "ABC" },
          { oldText: "bcd", newText: "BCD" },
        ],
      }),
    ).rejects.toThrow(/must not overlap/i);
  });
});
