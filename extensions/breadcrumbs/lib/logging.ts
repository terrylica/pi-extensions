/**
 * Logging utility for breadcrumbs extension.
 *
 * Writes logs to ~/.pi/agent/breadcrumbs/<sanitized-cwd>/<run-id>/
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Sanitize a path for use as a directory name.
 */
function sanitizePath(p: string): string {
  const sanitized = p.replace(/[/\\]/g, "-");
  return `--${sanitized}--`;
}

/**
 * Generate a unique run ID.
 */
function generateRunId(operation: string): string {
  const now = new Date();
  const timestamp = (now.toISOString().split(".")[0] ?? "").replace(
    /[-:T]/g,
    "",
  );
  const formatted = timestamp.replace(/(\d{8})(\d{6})/, "$1-$2");
  const random = crypto.randomBytes(3).toString("hex");
  return `${operation}-${formatted}-${random}`;
}

function formatTimestamp(): string {
  const now = new Date();
  return (
    now.toTimeString().split(" ")[0] +
    "." +
    String(now.getMilliseconds()).padStart(3, "0")
  );
}

export interface HandoffLogger {
  runId: string;
  logPath: string;
  streamPath: string;
  log(message: string): Promise<void>;
  logData(label: string, data: unknown): Promise<void>;
  /** Log a text delta to the stream file */
  logStreamDelta(delta: string): Promise<void>;
  close(): Promise<void>;
}

class HandoffLoggerImpl implements HandoffLogger {
  public readonly runId: string;
  public readonly logPath: string;
  public readonly streamPath: string;
  private handle: fs.FileHandle | null = null;
  private streamHandle: fs.FileHandle | null = null;

  constructor(runId: string, logDir: string) {
    this.runId = runId;
    this.logPath = path.join(logDir, "handoff.log");
    this.streamPath = path.join(logDir, "response.txt");
  }

  async init(): Promise<void> {
    const dir = path.dirname(this.logPath);
    await fs.mkdir(dir, { recursive: true });
    this.handle = await fs.open(this.logPath, "a");
    this.streamHandle = await fs.open(this.streamPath, "a");
    await this.log("Handoff started");
  }

  async log(message: string): Promise<void> {
    if (this.handle) {
      await this.handle.write(`[${formatTimestamp()}] ${message}\n`);
    }
  }

  async logData(label: string, data: unknown): Promise<void> {
    if (this.handle) {
      const preview =
        typeof data === "string"
          ? `${data.length} chars`
          : JSON.stringify(data).slice(0, 200);
      await this.handle.write(`[${formatTimestamp()}] ${label}: ${preview}\n`);
    }
  }

  async logStreamDelta(delta: string): Promise<void> {
    if (this.streamHandle) {
      await this.streamHandle.write(delta);
    }
  }

  async close(): Promise<void> {
    await this.log("Handoff finished");
    try {
      await this.handle?.close();
    } catch {
      /* best effort */
    }
    try {
      await this.streamHandle?.close();
    } catch {
      /* best effort */
    }
    this.handle = null;
    this.streamHandle = null;
  }
}

/**
 * Create a logger for a handoff operation.
 */
export async function createHandoffLogger(cwd: string): Promise<HandoffLogger> {
  const runId = generateRunId("handoff");
  const baseDir = path.join(os.homedir(), ".pi", "agent");
  const sanitizedCwd = sanitizePath(cwd);
  const logDir = path.join(baseDir, "breadcrumbs", sanitizedCwd, runId);

  const logger = new HandoffLoggerImpl(runId, logDir);
  await logger.init();
  return logger;
}
