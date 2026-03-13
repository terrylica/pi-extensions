import { mkdtempSync } from "node:fs";
import { cp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TextContent } from "@mariozechner/pi-ai";
import { type AgentToolResult, initTheme } from "@mariozechner/pi-coding-agent";
import {
  afterEach,
  assert,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  createPiTestHarness,
  type PiTestHarness,
} from "../../../tests/utils/pi-test-harness";
import { NOOP_THEME } from "../../../tests/utils/theme";
import { setupReadTool } from "./read";

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__/read",
);

/**
 * Extract the raw text from a Text component by calling render() with a
 * wide width. The Text class stores its content privately, so render() is
 * the public access path.
 */
function extractText(component: { render(width: number): string[] }): string {
  const lines = component.render(1000);
  return lines.join("\n");
}

describe("defaults read tool", () => {
  // keyHint() requires global theme initialization
  beforeAll(() => {
    initTheme();
  });

  describe("directory reads", () => {
    let testDir: string;
    let pi: PiTestHarness;

    beforeEach(async () => {
      testDir = mkdtempSync(join(tmpdir(), "read-test-"));
      await cp(join(fixturesRoot, "directory-input"), testDir, {
        recursive: true,
      });
      pi = await createPiTestHarness(setupReadTool, { cwd: testDir });
    });

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true });
    });

    it("delegates to ls using tool context cwd", async () => {
      expect(pi).toHaveRegisteredTool("read");

      const result = await pi.tool("read").execute({ path: "." });
      const textItem = (result as { content: TextContent[] }).content.find(
        (e): e is TextContent => e.type === "text",
      );

      assert(textItem?.text);

      expect(textItem.text).toContain("aaa-dir/");
      expect(textItem.text).toContain("zzz-file.txt");
      expect(textItem.text).not.toMatch(/^1#[A-Za-z0-9]+:/m);
    });
  });

  describe("file reads", () => {
    let testDir: string;
    let pi: PiTestHarness;

    beforeEach(async () => {
      testDir = mkdtempSync(join(tmpdir(), "read-test-"));
      await cp(join(fixturesRoot, "file-input"), testDir, { recursive: true });
      pi = await createPiTestHarness(setupReadTool, { cwd: testDir });
    });

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true });
    });

    it("adds LINE#HASH tags", async () => {
      expect(pi).toHaveRegisteredTool("read");

      const result = await pi.tool("read").execute({ path: "file.txt" });
      const textItem = (result as { content: TextContent[] }).content.find(
        (e): e is TextContent => e.type === "text",
      );

      assert(textItem?.text);

      expect(textItem.text).toMatch(/^1#[A-Za-z0-9]+:hello$/m);
      expect(textItem.text).toMatch(/^2#[A-Za-z0-9]+:world$/m);
    });
  });

  describe("renderCall", () => {
    let pi: PiTestHarness;

    beforeEach(async () => {
      pi = await createPiTestHarness(setupReadTool);
    });

    it("renders tool header with path", () => {
      const { registered } = pi.tool("read");
      assert(registered.renderCall, "renderCall should be defined");

      const result = registered.renderCall(
        { path: "/some/file.ts" },
        NOOP_THEME,
      );

      assert(result, "renderCall should return a component");
      const text = extractText(result);
      expect(text).toContain("read");
      expect(text).toContain("/some/file.ts");
    });

    it("renders line range when offset and limit are provided", () => {
      const { registered } = pi.tool("read");
      assert(registered.renderCall);

      const result = registered.renderCall(
        { path: "/some/file.ts", offset: 10, limit: 20 },
        NOOP_THEME,
      );

      assert(result);
      const text = extractText(result);
      expect(text).toContain(":10-29");
    });

    it("renders offset-only range", () => {
      const { registered } = pi.tool("read");
      assert(registered.renderCall);

      const result = registered.renderCall(
        { path: "/some/file.ts", offset: 5 },
        NOOP_THEME,
      );

      assert(result);
      const text = extractText(result);
      expect(text).toContain(":5");
      // Should not have a range end
      expect(text).not.toMatch(/:5-/);
    });
  });

  describe("renderResult", () => {
    let testDir: string;
    let pi: PiTestHarness;

    beforeEach(async () => {
      testDir = mkdtempSync(join(tmpdir(), "read-test-"));
      await cp(join(fixturesRoot, "file-input"), testDir, { recursive: true });
      pi = await createPiTestHarness(setupReadTool, { cwd: testDir });
    });

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true });
    });

    it("strips LINE#HASH: tags from display", async () => {
      const readTool = pi.tool("read");
      const result = (await readTool.execute({
        path: "file.txt",
      })) as AgentToolResult<unknown>;
      assert(
        readTool.registered.renderResult,
        "renderResult should be defined",
      );

      // Verify the model result has tags
      const textItem = result.content.find(
        (e): e is TextContent => e.type === "text",
      );
      assert(textItem?.text);
      expect(textItem.text).toMatch(/^\d+#[A-Z]{2}:/m);

      // Verify the rendered display strips them
      const rendered = readTool.registered.renderResult(
        result as AgentToolResult<unknown>,
        { expanded: true, isPartial: false },
        NOOP_THEME,
      );

      assert(rendered, "renderResult should return a component");
      const displayText = extractText(rendered);
      expect(displayText).not.toMatch(/\d+#[A-Z]{2}:/);
      expect(displayText).toContain("hello");
      expect(displayText).toContain("world");
    });

    it("collapses to 10 lines when not expanded", async () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
      await writeFile(join(testDir, "long.txt"), lines.join("\n"));

      const readTool = pi.tool("read");
      const result = (await readTool.execute({
        path: "long.txt",
      })) as AgentToolResult<unknown>;
      assert(readTool.registered.renderResult);

      const rendered = readTool.registered.renderResult(
        result,
        { expanded: false, isPartial: false },
        NOOP_THEME,
      );

      assert(rendered);
      const displayText = extractText(rendered);
      expect(displayText).toContain("10 more lines");
    });

    it("shows all lines when expanded", async () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
      await writeFile(join(testDir, "long.txt"), lines.join("\n"));

      const readTool = pi.tool("read");
      const result = (await readTool.execute({
        path: "long.txt",
      })) as AgentToolResult<unknown>;
      assert(readTool.registered.renderResult);

      const rendered = readTool.registered.renderResult(
        result,
        { expanded: true, isPartial: false },
        NOOP_THEME,
      );

      assert(rendered);
      const displayText = extractText(rendered);
      expect(displayText).not.toContain("more lines");
      expect(displayText).toContain("line 20");
    });

    it("returns [image] for image content", () => {
      const readTool = pi.tool("read");
      assert(readTool.registered.renderResult);

      // Simulate an image result (images come from reading image files)
      const imageResult = {
        content: [
          {
            type: "image" as const,
            data: "abc",
            mimeType: "image/png",
          },
        ],
        details: {},
      };

      const rendered = readTool.registered.renderResult(
        imageResult,
        { expanded: false, isPartial: false },
        NOOP_THEME,
      );

      assert(rendered);
      const displayText = extractText(rendered);
      expect(displayText).toContain("[image]");
    });

    it("returns empty text for empty content", () => {
      const readTool = pi.tool("read");
      assert(readTool.registered.renderResult);

      const emptyResult = {
        content: [],
        details: {},
      };

      const rendered = readTool.registered.renderResult(
        emptyResult,
        { expanded: false, isPartial: false },
        NOOP_THEME,
      );

      assert(rendered);
      const displayText = extractText(rendered);
      expect(displayText).toBe("");
    });
  });
});
