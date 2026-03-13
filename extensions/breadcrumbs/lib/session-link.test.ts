import { describe, expect, it } from "vitest";
import { messageContentToText } from "./session-link";

describe("breadcrumbs session-link", () => {
  describe("messageContentToText", () => {
    it("returns string content unchanged", () => {
      expect(messageContentToText("hello world")).toBe("hello world");
    });

    it("joins multiple text parts with newlines", () => {
      expect(
        messageContentToText([
          { type: "text", text: "first paragraph" },
          { type: "text", text: "second paragraph" },
        ]),
      ).toBe("first paragraph\nsecond paragraph");
    });

    it("ignores non-text parts", () => {
      expect(
        messageContentToText([
          { type: "text", text: "before" },
          { type: "toolCall" },
          { type: "thinking" },
          { type: "text", text: "after" },
        ]),
      ).toBe("before\nafter");
    });

    it("returns empty string when no text is extractable", () => {
      expect(
        messageContentToText([{ type: "toolCall" }, { type: "thinking" }]),
      ).toBe("");
    });
  });
});
