import {
	type CustomMessageEntry,
	SessionManager,
} from "@mariozechner/pi-coding-agent";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createPiTestHarness,
	type PiTestHarness,
} from "../../../tests/utils/pi-test-harness";
import {
	SESSION_LINK_SOURCE_TYPE,
	type SessionLinkSourceDetails,
} from "../lib/session-link";
import { setupSpawnCommand } from "./spawn";

/**
 * Seed a real in-memory SessionManager with a user message so the session
 * has a leaf entry.
 */
function seedParentSession(): SessionManager {
	const sm = SessionManager.inMemory();
	sm.appendMessage({
		role: "user",
		content: "parent message",
		timestamp: Date.now(),
	});
	return sm;
}

describe("breadcrumbs /spawn command", () => {
	let pi: PiTestHarness;

	beforeEach(async () => {
		pi = await createPiTestHarness(setupSpawnCommand);
	});

	it("registers the spawn command", () => {
		expect(pi).toHaveRegisteredCommand("spawn");
	});

	it("writes a session link source into the child session", async () => {
		const parentSm = seedParentSession();
		const setEditorText = vi.fn();

		pi = await createPiTestHarness(setupSpawnCommand, {
			context: {
				sessionManager: parentSm,
				ui: { setEditorText },
			},
		});

		await pi.command("spawn").execute("focus on tests");

		expect(pi.newSession).toHaveBeenCalledTimes(1);
		expect(setEditorText).toHaveBeenCalledWith("focus on tests");

		const childSm = pi.getChildSessionManager();
		expect(childSm).toBeDefined();
		if (!childSm) throw new Error("childSm should be defined");

		const entries = childSm.getEntries();
		const sourceEntry = entries.find(
			(e): e is CustomMessageEntry<SessionLinkSourceDetails> =>
				e.type === "custom_message" &&
				(e as CustomMessageEntry).customType === SESSION_LINK_SOURCE_TYPE,
		);

		expect(sourceEntry).toBeDefined();
		expect(sourceEntry?.display).toBe(true);

		const content =
			typeof sourceEntry?.content === "string" ? sourceEntry?.content : "";
		expect(content).toContain(
			`read_session({ sessionId: "${parentSm.getSessionId()}", goal: "Get the last assistant message with context" })`,
		);

		expect(sourceEntry?.details).toEqual({
			parentSessionId: parentSm.getSessionId(),
			goal: "focus on tests",
			linkType: "continue",
		});
	});

	it("notifies and aborts when there is no active parent leaf", async () => {
		const notify = vi.fn();

		pi = await createPiTestHarness(setupSpawnCommand, {
			context: {
				sessionManager: SessionManager.inMemory(),
				ui: { notify },
			},
		});

		await pi.command("spawn").execute("");

		expect(notify).toHaveBeenCalledWith(
			"Failed to get parent session leaf ID",
			"error",
		);
		expect(pi.newSession).not.toHaveBeenCalled();
	});
});
