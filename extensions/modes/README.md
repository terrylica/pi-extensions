# modes

Hardcoded mode system for Pi with tool policy, model switching, and per-branch restore.

## Modes

- `default`
  - Native built-ins enabled: `read`, `bash`, `edit`, `write`
  - Native built-ins disabled by default: `grep`, `find`, `ls`
  - All extension tools enabled
  - No provider/model override

- `research`
  - Native built-ins enabled: `read`, `ls`, `find`, `grep`
  - Native built-ins blocked: `write`, `edit`
  - Native `bash` requires explicit approval for every call
  - Extension tools require confirmation by default (can allow for session)
  - Side-effecting extension tools blocked by policy: `worker`, `process`
  - Provider/model: `anthropic / claude-opus-4-6`

## Controls

- `/mode` opens selector
- `/mode <default|research>` switches directly
- `Ctrl+U` cycles modes
- `--agent-mode <default|research>` sets startup mode

## Behavior

- Tool access is policy-based:
  - each tool resolves to `enabled`, `disabled`, or `confirm`
  - `pi.setActiveTools()` includes only `enabled` + `confirm`
  - `tool_call` hook enforces runtime blocking/confirmation
- Mode state persisted with `appendEntry("mode-state", ...)`
- Restores mode per branch using `sessionManager.getBranch()`
- Appends mode instructions to system prompt on each turn
- Sends UI-visible custom `mode-switch` messages
- Filters `mode-switch` messages out of LLM context via `context` hook
- Emits `ad:notify:dangerous` when mode gating requires attention

## Event compatibility pattern

For cross-extension notification and sound interoperability, emit this event shape:

```ts
pi.events.emit("ad:notify:dangerous", {
  command: string,
  description: string,
  pattern: string,
  toolName?: string,
  toolCallId?: string,
});
```

`defaults` listens for this event, plays the attention sound, and uses `toolName`/`toolCallId` (when present) to keep terminal-title attention aligned with the exact triggering tool call.

## Config overrides

You can override tool gating per mode via pi-utils-settings config files:

- Global: `~/.pi/agent/extensions/modes.json`
- Local: `<project>/.pi/extensions/modes.json`

Schema:

```json
{
  "tools": {
    "research": {
      "allow": ["read_url", "list_sessions"],
      "deny": ["worker", "process"]
    },
    "default": {
      "allow": [],
      "deny": []
    }
  }
}
```

Rules:
- `deny` forces a tool to `disabled`.
- `allow` forces a tool to `enabled` (bypasses confirmation state).
- If a tool is in both, `deny` wins.

## Notes

- No config file and no enabled toggle by design
- Editor border line color follows normal thinking-level behavior
- Mode label uses hardcoded ANSI color (research cyan)
