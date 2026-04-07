import type { ModeColor } from "../../packages/events";
import { getModeToolOverride } from "./config";

export type ToolAccess = "enabled" | "disabled" | "confirm";

export interface ToolPolicyRule {
  access: ToolAccess;
  allowSession?: boolean;
}

export interface ModeToolPolicy {
  nativeDefault: ToolPolicyRule;
  extensionDefault: ToolPolicyRule;
  native: Record<string, ToolPolicyRule>;
  extension: Record<string, ToolPolicyRule>;
}

export type ThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export interface ModeDefinition {
  name: string;
  label: string;
  labelColor: ModeColor;
  toolPolicy: ModeToolPolicy;
  provider?: string;
  model?: string;
  thinkingLevel?: ThinkingLevel;
  instructions?: string;
}

export const BUILTIN_TOOL_NAMES = new Set([
  "read",
  "bash",
  "edit",
  "write",
  "grep",
  "find",
  "ls",
]);

function isBuiltinTool(toolName: string): boolean {
  return BUILTIN_TOOL_NAMES.has(toolName);
}

function normalizeRule(rule: ToolPolicyRule): ToolPolicyRule {
  if (rule.access !== "confirm") {
    return { access: rule.access };
  }

  return {
    access: "confirm",
    allowSession: rule.allowSession ?? true,
  };
}

export function resolveToolPolicy(
  mode: ModeDefinition,
  toolName: string,
): ToolPolicyRule {
  const isBuiltin = isBuiltinTool(toolName);
  const modeRule = isBuiltin
    ? mode.toolPolicy.native[toolName]
    : mode.toolPolicy.extension[toolName];

  const baseRule = normalizeRule(
    modeRule ??
      (isBuiltin
        ? mode.toolPolicy.nativeDefault
        : mode.toolPolicy.extensionDefault),
  );

  const override = getModeToolOverride(mode.name);
  if (override.deny.has(toolName)) {
    return { access: "disabled" };
  }

  if (override.allow.has(toolName)) {
    return { access: "enabled" };
  }

  return baseRule;
}

export const MODE_ORDER: string[] = ["balanced", "plan", "implement"];

// ---------------------------------------------------------------------------
// Mode instructions
// ---------------------------------------------------------------------------
// These REPLACE the family prompt when a mode is active. They must be
// self-contained: identity + behavioral rules + mode-specific constraints.
// ---------------------------------------------------------------------------

const BALANCED_INSTRUCTIONS = `You are Pi, an expert coding assistant.

Be concise. Sacrifice grammar for brevity. Let code speak for itself.

- Prefer parallel tool calls for independent operations.
- Use specialized tools (read, grep, find, ls) over bash for file exploration.
- Never propose changes to code you have not read.
- Match existing code style, conventions, and libraries.
- Work incrementally: small change, verify, continue.
- Do not add features, refactor code, or make improvements beyond what was asked.`;

const PLAN_INSTRUCTIONS = `You are Pi, an expert coding assistant in PLAN MODE. You analyze, research, and plan but do not modify files.

Rules:
- Do not modify files or system state.
- Use read, grep, find, ls for local code exploration.
- Use research tools (scout, lookout, oracle) for deep investigation.
- Prefer deep exploration and evidence-backed findings.

When planning:
- Read all relevant code before proposing changes.
- Identify risks, edge cases, and dependencies.
- Structure plans as ordered steps with file paths and line references.
- List unresolved questions at the end.
- Cite sources for every claim about the codebase.

Output format:
- Start with a summary of findings.
- Follow with a structured plan (numbered steps).
- End with open questions and risks.`;

const IMPLEMENT_INSTRUCTIONS = `You are Pi, an expert coding assistant in IMPLEMENT MODE. Execute tasks with minimal explanation.

SPEED FIRST. Do the work. Let the code speak.

- Read code before editing. Understand conventions first.
- Make the smallest reasonable diff. Do not rewrite whole files.
- Work incrementally: small change, verify, continue.
- After changes, verify with build/test/lint commands.
- Do not add features or improvements beyond what was asked.
- Do not add error handling for scenarios that cannot happen.
- Do not create abstractions for one-time operations.

Communication:
- Ultra concise. 1-3 words for simple questions.
- For code tasks: do the work, no explanation unless asked.
- Report verification results (pass/fail counts) when done.`;

// ---------------------------------------------------------------------------
// Tool policies
// ---------------------------------------------------------------------------

const ALL_TOOLS_POLICY: ModeToolPolicy = {
  nativeDefault: { access: "enabled" },
  extensionDefault: { access: "enabled" },
  native: {},
  extension: {
    switch_mode: { access: "enabled" },
  },
};

const PLAN_TOOL_POLICY: ModeToolPolicy = {
  nativeDefault: { access: "disabled" },
  extensionDefault: { access: "confirm", allowSession: true },
  native: {
    read: { access: "enabled" },
    ls: { access: "enabled" },
    find: { access: "enabled" },
    grep: { access: "enabled" },
    bash: { access: "confirm", allowSession: false },
    write: { access: "disabled" },
    edit: { access: "disabled" },
  },
  extension: {
    switch_mode: { access: "enabled" },
    get_current_time: { access: "enabled" },
    read_url: { access: "enabled" },
    find_sessions: { access: "enabled" },
    list_sessions: { access: "enabled" },
    read_session: { access: "enabled" },
    ask_user: { access: "enabled" },
    synthetic_web_search: { access: "enabled" },
    linkup_web_search: { access: "enabled" },
    linkup_web_answer: { access: "enabled" },
    linkup_web_fetch: { access: "enabled" },
    scout: { access: "enabled" },
    lookout: { access: "enabled" },
    oracle: { access: "enabled" },
    reviewer: { access: "enabled" },
    worker: { access: "disabled" },
    process: { access: "disabled" },
  },
};

// ---------------------------------------------------------------------------
// Mode definitions
// ---------------------------------------------------------------------------

export const MODES: Record<string, ModeDefinition> = {
  balanced: {
    name: "balanced",
    label: "balanced",
    labelColor: { source: "raw", color: "#777777" },
    toolPolicy: ALL_TOOLS_POLICY,
    provider: "synthetic",
    model: "hf:nvidia/Kimi-K2.5-NVFP4",
    thinkingLevel: "low",
    instructions: BALANCED_INSTRUCTIONS,
  },
  plan: {
    name: "plan",
    label: "plan",
    labelColor: { source: "raw", color: "#7a8aa6" },
    toolPolicy: PLAN_TOOL_POLICY,
    provider: "openai-codex",
    model: "gpt-5.4",
    thinkingLevel: "high",
    instructions: PLAN_INSTRUCTIONS,
  },
  implement: {
    name: "implement",
    label: "implement",
    labelColor: { source: "raw", color: "#99ad6a" },
    toolPolicy: ALL_TOOLS_POLICY,
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    thinkingLevel: "low",
    instructions: IMPLEMENT_INSTRUCTIONS,
  },
};

export const DEFAULT_MODE: ModeDefinition = MODES.balanced as ModeDefinition;
