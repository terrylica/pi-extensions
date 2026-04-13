/**
 * Notification Hook
 *
 * Sends OS-level notifications directly from defaults.
 * Uses terminal OSC sequences and optional macOS sounds.
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ToolResultMessage } from "@mariozechner/pi-ai";
import type {
  ExtensionAPI,
  ExtensionContext,
  ToolCallEvent,
} from "@mariozechner/pi-coding-agent";
import {
  AD_NOTIFY_ATTENTION_EVENT,
  AD_NOTIFY_DANGEROUS_EVENT,
  AD_NOTIFY_DONE_EVENT,
  AD_TERMINAL_TITLE_ATTENTION_EVENT,
} from "../../../packages/events";

// Path to the native binary (resolved relative to this file)
const PLAY_ALERT_SOUND_BINARY = fileURLToPath(
  new URL("../../../bin/play-alert-sound", import.meta.url),
);

// const DEFAULT_SOUND = "/System/Library/Sounds/Blow.aiff";
const DEFAULT_SOUND = "/System/Library/Sounds/Funk.aiff";
const ATTENTION_SOUND = "/System/Library/Sounds/Glass.aiff";

interface DangerousEvent {
  description: string;
  toolName?: string;
  toolCallId?: string;
}

interface AttentionEvent {
  description?: string;
  reason?: string;
  toolName?: string;
  toolCallId?: string;
}

interface DoneEvent {
  summary?: string;
  status?: "ok" | "error";
  loops?: number;
  toolCalls?: number;
}

type AttentionTitleEvent = {
  source: string;
  action: "start" | "end";
  toolCallId?: string;
  toolName?: string;
};

function isAgentRunAborted(event: unknown): boolean {
  if (!event || typeof event !== "object") return false;

  const messages = (event as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return false;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || typeof message !== "object") continue;

    const role = (message as { role?: unknown }).role;
    if (role !== "assistant") continue;

    const stopReason = (message as { stopReason?: unknown }).stopReason;
    return (
      typeof stopReason === "string" && stopReason.toLowerCase() === "aborted"
    );
  }

  return false;
}

type ToolCallHandler = (
  event: ToolCallEvent,
  ctx: ExtensionContext,
) => string | undefined;
type ToolResultHandler = (
  event: ToolResultMessage,
  ctx: ExtensionContext,
) => string | undefined;

interface ToolStartNotification {
  toolName: string;
  trigger: "start";
  sound?: string;
  handler: ToolCallHandler;
}

interface ToolEndNotification {
  toolName: string;
  trigger: "end";
  sound?: string;
  handler: ToolResultHandler;
}

type ToolNotification = ToolStartNotification | ToolEndNotification;

const TOOL_NOTIFICATIONS: ToolNotification[] = [
  {
    toolName: "ask_user",
    trigger: "start",
    sound: ATTENTION_SOUND,
    handler: () => "Waiting for user input",
  },
];

function shouldUseTerminalEffects(ctx: ExtensionContext): boolean {
  return ctx.hasUI && process.stdout.isTTY;
}

/**
 * Send terminal notification using OSC escape sequences.
 * OSC 9: Ghostty, ConEmu
 * OSC 777: iTerm2, WezTerm, Kitty
 */
function sendSystemNotification(message: string): void {
  const title = "Pi";
  process.stdout.write(`\x1b]9;${title}: ${message}\x1b\\`);
  process.stdout.write(`\x1b]777;notify;${title};${message}\x1b\\`);
}

/**
 * Play notification sound (macOS only).
 * Uses the play-alert-sound binary which respects system alert volume.
 */
async function playSound(pi: ExtensionAPI, soundPath: string): Promise<void> {
  if (process.platform !== "darwin") return;
  if (!existsSync(PLAY_ALERT_SOUND_BINARY)) return;

  try {
    const result = await pi.exec(PLAY_ALERT_SOUND_BINARY, [soundPath]);
    if (result.code !== 0) {
      // Sound failed to play, but this is non-critical
    }
  } catch {
    // Ignore sound playback errors
  }
}

async function notify(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  message: string,
  sound?: string,
): Promise<void> {
  if (!shouldUseTerminalEffects(ctx)) return;
  sendSystemNotification(message);
  if (sound) await playSound(pi, sound);
}

function emitAttentionTitleEvent(
  pi: ExtensionAPI,
  action: "start" | "end",
  toolCallId?: string,
  toolName?: string,
): void {
  const payload: AttentionTitleEvent = {
    source: "chrome:notification",
    action,
  };
  if (toolCallId) payload.toolCallId = toolCallId;
  if (toolName) payload.toolName = toolName;
  pi.events.emit(AD_TERMINAL_TITLE_ATTENTION_EVENT, payload);
}

async function handleDangerousLikeEvent(
  pi: ExtensionAPI,
  lastCtx: ExtensionContext | undefined,
  data: unknown,
): Promise<void> {
  if (!lastCtx) return;
  const event = data as DangerousEvent;
  const message = `Dangerous command detected: ${event.description}`;
  emitAttentionTitleEvent(pi, "start", event.toolCallId, event.toolName);
  await notify(pi, lastCtx, message, ATTENTION_SOUND);
}

async function handleAttentionEvent(
  pi: ExtensionAPI,
  lastCtx: ExtensionContext | undefined,
  data: unknown,
): Promise<void> {
  if (!lastCtx) return;
  const event = data as AttentionEvent;
  const message = event.description ?? event.reason ?? "Waiting for user input";
  emitAttentionTitleEvent(pi, "start", event.toolCallId, event.toolName);
  await notify(pi, lastCtx, message, ATTENTION_SOUND);
}

async function handleDoneEvent(
  pi: ExtensionAPI,
  lastCtx: ExtensionContext | undefined,
  data: unknown,
): Promise<void> {
  if (!lastCtx) return;
  const event = data as DoneEvent;
  const message = event.summary ?? "done";
  await notify(pi, lastCtx, message, DEFAULT_SOUND);
}

export function setupNotificationHook(pi: ExtensionAPI) {
  let loopCount = 0;
  let toolCallCount = 0;
  let hadError = false;
  let lastCtx: ExtensionContext | undefined;

  const startNotifications = TOOL_NOTIFICATIONS.filter(
    (n): n is ToolStartNotification => n.trigger === "start",
  );
  const endNotifications = TOOL_NOTIFICATIONS.filter(
    (n): n is ToolEndNotification => n.trigger === "end",
  );

  pi.on("session_start", async (_event, ctx) => {
    lastCtx = ctx;
  });

  pi.on("tool_call", async (event, ctx) => {
    lastCtx = ctx;
    toolCallCount++;

    const notification = startNotifications.find(
      (n) => n.toolName === event.toolName,
    );
    if (notification) {
      const message = notification.handler(event, ctx);
      if (message) {
        if (notification.sound === ATTENTION_SOUND) {
          emitAttentionTitleEvent(
            pi,
            "start",
            event.toolCallId,
            event.toolName,
          );
        }
        await notify(pi, ctx, message, notification.sound);
      }
    }

    return undefined;
  });

  pi.on("turn_end", async (event, ctx) => {
    lastCtx = ctx;
    loopCount++;

    for (const result of event.toolResults) {
      if (result.isError) hadError = true;

      const startNotification = startNotifications.find(
        (n) => n.toolName === result.toolName,
      );
      if (startNotification?.sound === ATTENTION_SOUND) {
        emitAttentionTitleEvent(pi, "end", result.toolCallId, result.toolName);
      }

      const notification = endNotifications.find(
        (n) => n.toolName === result.toolName,
      );
      if (notification) {
        const message = notification.handler(result, ctx);
        if (message) {
          await notify(pi, ctx, message, notification.sound);
        }
      }
    }
  });

  pi.on("agent_end", async (event, ctx) => {
    lastCtx = ctx;
    const wasRunning = loopCount > 0;
    const wasAborted = isAgentRunAborted(event);

    if (wasRunning && !wasAborted) {
      const status = hadError ? "error" : "ok";
      const summary = `${hadError ? "with errors" : "done"} - ${loopCount} loops, ${toolCallCount} tools`;
      pi.events.emit(AD_NOTIFY_DONE_EVENT, {
        source: "chrome:notification",
        status,
        loops: loopCount,
        toolCalls: toolCallCount,
        summary,
      });
    }

    // Reset counters for next run
    loopCount = 0;
    toolCallCount = 0;
    hadError = false;
  });

  pi.events.on(AD_NOTIFY_DANGEROUS_EVENT, (data: unknown) => {
    void handleDangerousLikeEvent(pi, lastCtx, data);
  });

  pi.events.on(AD_NOTIFY_ATTENTION_EVENT, (data: unknown) => {
    void handleAttentionEvent(pi, lastCtx, data);
  });

  pi.events.on(AD_NOTIFY_DONE_EVENT, (data: unknown) => {
    void handleDoneEvent(pi, lastCtx, data);
  });
}
