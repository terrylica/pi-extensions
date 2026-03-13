import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  RegisteredCommand,
} from "@mariozechner/pi-coding-agent";
import { createMock, type PartialFuncReturn } from "./create-mock";

type RegisteredTool = Parameters<ExtensionAPI["registerTool"]>[0];
type ToolContext = NonNullable<Parameters<RegisteredTool["execute"]>[4]>;
type PiMockState = {
  registeredTools: Map<string, RegisteredTool>;
  registeredCommands: Map<string, RegisteredCommand>;
};

const piMockStates = new WeakMap<object, PiMockState>();

function getState(pi: unknown): PiMockState | undefined {
  if (!pi || typeof pi !== "object") return undefined;
  return piMockStates.get(pi);
}

export function createPiDeepMock(options: { cwd?: string } = {}) {
  const cwd = options.cwd ?? mkdtempSync(join(tmpdir(), "pi-test-cwd-"));

  const state: PiMockState = {
    registeredTools: new Map<string, RegisteredTool>(),
    registeredCommands: new Map<string, RegisteredCommand>(),
  };

  const pi = createMock<ExtensionAPI>(
    {
      registerTool(tool) {
        state.registeredTools.set(tool.name, tool as RegisteredTool);
      },
      registerCommand(name, options) {
        state.registeredCommands.set(name, { name, ...options });
      },
    },
    { name: "pi" },
  );

  piMockStates.set(pi, state);

  const toolCtx = createMock<ToolContext>(
    {
      cwd,
    } as PartialFuncReturn<ToolContext>,
    { name: "toolCtx" },
  );

  let toolCallCounter = 0;

  function tool(name: string) {
    const registered = state.registeredTools.get(name);
    if (!registered) {
      throw new Error(
        `Tool "${name}" is not registered. Registered: [${[...state.registeredTools.keys()].join(", ")}]`,
      );
    }
    return {
      registered,
      execute(params: Parameters<typeof registered.execute>[1]) {
        const id = `tc_${++toolCallCounter}`;
        return registered.execute(id, params, undefined, undefined, toolCtx);
      },
    };
  }

  function command(name: string) {
    const registered = state.registeredCommands.get(name);
    if (!registered) {
      throw new Error(
        `Command "${name}" is not registered. Registered: [${[...state.registeredCommands.keys()].join(", ")}]`,
      );
    }
    return {
      registered,
      async execute(
        args = "",
        ctxOverrides: PartialFuncReturn<ExtensionCommandContext> = {},
      ) {
        const ctx = createMock<ExtensionCommandContext>(
          {
            cwd,
            hasUI: true,
            isIdle: () => true,
            abort: () => {},
            hasPendingMessages: () => false,
            shutdown: () => {},
            compact: () => {},
            getContextUsage: () => undefined,
            getSystemPrompt: () => "",
            waitForIdle: async () => {},
            newSession: async () => ({ cancelled: false }),
            fork: async () => ({ cancelled: false }),
            navigateTree: async () => ({ cancelled: false }),
            switchSession: async () => ({ cancelled: false }),
            reload: async () => {},
            ...ctxOverrides,
          } as PartialFuncReturn<ExtensionCommandContext>,
          { name: "commandCtx" },
        );

        await registered.handler(args, ctx);
        return ctx;
      },
    };
  }

  return { pi, tool, command, cwd };
}

export function hasRegisteredTool(pi: ExtensionAPI, name: string): boolean {
  return getState(pi)?.registeredTools.has(name) ?? false;
}

export function hasRegisteredCommand(pi: ExtensionAPI, name: string): boolean {
  return getState(pi)?.registeredCommands.has(name) ?? false;
}

export function listRegisteredCommands(pi: ExtensionAPI): string[] {
  return [...(getState(pi)?.registeredCommands.keys() ?? [])];
}

export function listRegisteredTools(pi: ExtensionAPI): string[] {
  return [...(getState(pi)?.registeredTools.keys() ?? [])];
}
