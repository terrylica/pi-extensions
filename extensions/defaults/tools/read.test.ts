import { mkdtempSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TextContent } from "@mariozechner/pi-ai";
import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";
import { createPiDeepMock } from "../../../tests/utils/pi";
import { setupReadTool } from "./read";

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__/read",
);

describe("defaults read tool", () => {
  describe("directory reads", () => {
    let testDir: string;

    beforeEach(async () => {
      testDir = mkdtempSync(join(tmpdir(), "read-test-"));
      await cp(join(fixturesRoot, "directory-input"), testDir, {
        recursive: true,
      });
    });

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true });
    });

    it("delegates to ls using tool context cwd", async () => {
      const { pi, tool } = createPiDeepMock({ cwd: testDir });
      setupReadTool(pi);
      expect(pi).toHaveRegisteredTool("read");

      const result = await tool("read").execute({ path: "." });
      const textItem = result.content.find(
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

    beforeEach(async () => {
      testDir = mkdtempSync(join(tmpdir(), "read-test-"));
      await cp(join(fixturesRoot, "file-input"), testDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true });
    });

    it("adds LINE#HASH tags", async () => {
      const { pi, tool } = createPiDeepMock({ cwd: testDir });
      setupReadTool(pi);
      expect(pi).toHaveRegisteredTool("read");

      const result = await tool("read").execute({ path: "file.txt" });
      const textItem = result.content.find(
        (e): e is TextContent => e.type === "text",
      );

      assert(textItem?.text);

      expect(textItem.text).toMatch(/^1#[A-Za-z0-9]+:hello$/m);
      expect(textItem.text).toMatch(/^2#[A-Za-z0-9]+:world$/m);
    });
  });
});
