# Hooks (Events)

Hooks let extensions react to lifecycle events. They are registered with `pi.on(eventName, handler)`.

## Event Reference

### Session Events

| Event | When | Can Cancel | Payload |
|---|---|---|---|
| `session_start` | New session created | No | `{}` |
| `session_switch` | Switched to different session | No | `{ reason: "new" \| "switch" \| "fork" }` |
| `session_before_switch` | Before switching sessions | Yes (`{ cancel: true }`) | `{ reason: "new" \| "switch" \| "fork" }` |
| `session_before_fork` | Before forking a session | Yes (`{ cancel: true }`) | `{}` |
| `session_fork` | After session was forked | No | `{}` |
| `session_shutdown` | Pi is shutting down | No | `{}` |
| `session_before_compact` | Before compaction | Yes (return custom summary string) | `{ summary: string }` |

### Agent Events

| Event | When | Payload |
|---|---|---|
| `before_agent_start` | Before agent turn starts | `{}` |
| `agent_start` | Agent turn started | `{}` |
| `turn_start` | Turn begins processing | `{}` |
| `turn_end` | Turn finishes processing | `{}` |
| `model_select` | User changed the model | `{ model: string }` |

### Tool Events

| Event | When | Can Block | Payload |
|---|---|---|---|
| `tool_call` | Before a tool executes | Yes (`{ block: true, reason }`) | `{ toolName, toolCallId, input }` |

### Input Events

| Event | When | Can Transform | Payload |
|---|---|---|---|
| `input` | User submitted a message | Yes (return transformed text) | `{ text: string }` |

### Bash Events

| Event | When | Can Modify | Payload |
|---|---|---|---|
| `user_bash` | Before bash command runs | Yes (return modified command/cwd/env) | `{ command, cwd }` |

## Handler Signature

```typescript
pi.on("event_name", async (event, ctx) => {
  // event: event-specific payload
  // ctx: ExtensionContext (hasUI, ui methods, cwd, model, etc.)
});
```

The handler receives the event payload and an `ExtensionContext`. The context provides access to UI methods, the current working directory, model info, and more.

## Blocking and Cancelling

Some events let you prevent the default behavior by returning an object.

### Blocking Tool Calls

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName === "bash" && event.input.command.includes("rm -rf /")) {
    // Check ctx.hasUI before prompting -- see references/modes.md
    if (!ctx.hasUI) {
      return { block: true, reason: "Blocked: dangerous command (no UI to confirm)" };
    }

    const confirmed = await ctx.ui.confirm(
      "Dangerous Command",
      `Allow: ${event.input.command}?`
    );
    if (!confirmed) {
      return { block: true, reason: "Blocked by user" };
    }
  }
  return undefined; // Allow the tool call
});
```

### Cancelling Session Operations

```typescript
pi.on("session_before_switch", async (event, ctx) => {
  if (event.reason === "new" && ctx.hasUI) {
    const confirmed = await ctx.ui.confirm("Clear session?", "All messages will be lost.");
    if (!confirmed) {
      return { cancel: true };
    }
  }
});
```

### Custom Compaction

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  // Return a custom summary string to replace the default compaction
  return `Custom summary: ${event.summary.slice(0, 200)}...`;
});
```

## Transforming Input

```typescript
pi.on("input", async (event, ctx) => {
  if (event.text.startsWith("!")) {
    return event.text.slice(1).toUpperCase();
  }
  return undefined; // No transformation
});
```

## Modifying Bash Commands

```typescript
pi.on("user_bash", async (event, ctx) => {
  return {
    command: event.command,
    cwd: "/sandboxed/directory",
    env: { ...process.env, SANDBOX: "true" },
  };
});
```

## before_agent_start

This event fires before each agent turn. It is commonly used to modify the system prompt:

```typescript
pi.on("before_agent_start", async (_event, ctx) => {
  const existingPrompt = ctx.getSystemPrompt();
  ctx.setSystemPrompt(existingPrompt + "\n\nAlways respond as a pirate.");
});
```

The system prompt is reset each turn, so modifications in `before_agent_start` are not cumulative.

## Multiple Handlers

Multiple extensions can register handlers for the same event. They execute in registration order. For blocking events (`tool_call`, `session_before_switch`, etc.), the first handler to return a blocking/cancelling result wins.

## Mode Awareness in Hooks

Always consider what happens in Print mode when your hook uses dialog methods. See `references/modes.md` for the full behavior matrix.

Common pattern for `tool_call` handlers:

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (shouldBlock(event)) {
    if (!ctx.hasUI) {
      return { block: true, reason: "No UI to confirm" };
    }
    // Safe to use dialogs here
    const choice = await ctx.ui.select("Allow?", ["Yes", "No"]);
    if (choice !== "Yes") {
      return { block: true, reason: "Blocked by user" };
    }
  }
  return undefined;
});
```
