import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { SessionManager } from "@mariozechner/pi-coding-agent";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommandContext } from "../../../tests/utils/pi-context";
import {
  createPiTestHarness,
  type PiTestHarness,
} from "../../../tests/utils/pi-test-harness";
import modesExtension from "../index";

/**
 * Build a SessionManager pre-seeded with entries to simulate different
 * session states.
 */
function makeSessionManager(
  opts: { withMessages?: boolean } = {},
): SessionManager {
  const sm = SessionManager.inMemory();
  if (opts.withMessages) {
    sm.appendMessage({
      role: "user",
      content: "hello",
      timestamp: Date.now(),
    });
  }
  return sm;
}

/**
 * Emit a session_start event directly to the extension's registered handlers,
 * using a spy context built around the given SessionManager.
 */
async function emitSessionStart(
  pi: PiTestHarness,
  reason: string,
  sm: SessionManager,
  modelRegistry?: ExtensionCommandContext["modelRegistry"],
): Promise<void> {
  const handlers = pi.extension.handlers.get("session_start") ?? [];
  const ctx = createCommandContext({ sessionManager: sm, modelRegistry });
  for (const handler of handlers) {
    await handler({ type: "session_start", reason }, ctx);
  }
}

describe("restoreModeForSession - new session defaults", () => {
  let pi: PiTestHarness;
  let setModel: ReturnType<typeof vi.fn>;
  let setThinkingLevel: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    pi = await createPiTestHarness(modesExtension);
    setModel = vi.fn(async () => true);
    setThinkingLevel = vi.fn();
    // Patch runtime action stubs with spies so calls don't throw.
    pi.runtime.setModel = setModel as unknown as typeof pi.runtime.setModel;
    pi.runtime.setThinkingLevel =
      setThinkingLevel as unknown as typeof pi.runtime.setThinkingLevel;
    pi.runtime.getAllTools = vi.fn(
      () => [],
    ) as unknown as typeof pi.runtime.getAllTools;
    pi.runtime.setActiveTools =
      vi.fn() as unknown as typeof pi.runtime.setActiveTools;
    pi.runtime.sendMessage =
      vi.fn() as unknown as typeof pi.runtime.sendMessage;
    pi.runtime.appendEntry =
      vi.fn() as unknown as typeof pi.runtime.appendEntry;
    pi.runtime.getThinkingLevel = vi.fn(
      () => "low" as const,
    ) as unknown as typeof pi.runtime.getThinkingLevel;
  });

  /** modelRegistry stub that returns a fake model for any provider/id lookup. */
  function makeModelRegistry(): ExtensionCommandContext["modelRegistry"] {
    return {
      find: vi.fn((_provider: string, id: string) => ({
        provider: _provider,
        id,
      })),
    } as unknown as ExtensionCommandContext["modelRegistry"];
  }

  it("forces balanced model+thinking on brand-new startup session (no messages)", async () => {
    const sm = makeSessionManager({ withMessages: false });
    await emitSessionStart(pi, "startup", sm, makeModelRegistry());
    expect(setThinkingLevel).toHaveBeenCalledWith("medium");
    expect(setModel).toHaveBeenCalledTimes(1);
  });

  it("forces balanced model+thinking on /spawn session (reason=new, no messages)", async () => {
    const sm = makeSessionManager({ withMessages: false });
    await emitSessionStart(pi, "new", sm, makeModelRegistry());
    expect(setThinkingLevel).toHaveBeenCalledWith("medium");
    expect(setModel).toHaveBeenCalledTimes(1);
  });

  it("does NOT force defaults on resume (reason=resume, has messages)", async () => {
    const sm = makeSessionManager({ withMessages: true });
    await emitSessionStart(pi, "resume", sm);
    expect(setModel).not.toHaveBeenCalled();
  });

  it("does NOT force defaults when reopening existing session (startup + has messages)", async () => {
    const sm = makeSessionManager({ withMessages: true });
    await emitSessionStart(pi, "startup", sm);
    expect(setModel).not.toHaveBeenCalled();
  });

  it("does NOT force defaults for unknown future reason values", async () => {
    const sm = makeSessionManager({ withMessages: false });
    await emitSessionStart(pi, "some-future-reason", sm);
    expect(setModel).not.toHaveBeenCalled();
  });
});
