import { describe, expect, it } from "vitest";
import { formatTerminalTitle } from "./terminal-title";

describe("terminal title formatting", () => {
  it("includes project context for normal terminals", () => {
    expect(
      formatTerminalTitle(
        "/Users/alioudiallo/code/src/pi.dev/pi-harness/extensions/defaults",
        "ask_user",
        {},
      ),
    ).toBe("π: pi-harness > extensions > defaults (ask_user)");
  });

  it("uses a compact title in cmux", () => {
    expect(
      formatTerminalTitle(
        "/Users/alioudiallo/code/src/pi.dev/pi-harness/extensions/defaults",
        "ask_user",
        { CMUX_WORKSPACE_ID: "abc" },
      ),
    ).toBe("π: (ask_user)");
  });

  it("uses just the pi symbol when cmux has no detail", () => {
    expect(
      formatTerminalTitle(
        "/Users/alioudiallo/code/src/pi.dev/pi-harness/extensions/defaults",
        undefined,
        { CMUX_SOCKET_PATH: "/tmp/cmux.sock" },
      ),
    ).toBe("π");
  });
});
