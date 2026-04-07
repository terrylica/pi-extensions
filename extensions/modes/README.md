# modes

Hardcoded mode system for Pi with prompt families, tool policy, model switching, and per-branch restore.

## Modes

- `balanced` (default)
  - All native and extension tools enabled
  - Provider/model: `synthetic / hf:nvidia/Kimi-K2.5-NVFP4`
  - Thinking: `low`

- `plan`
  - Native read-only tools enabled: `read`, `ls`, `find`, `grep`
  - Native `bash` requires explicit approval per call
  - Native `write`, `edit` blocked
  - Read-only/helper extension tools enabled: `get_current_time`, `read_url`, `find_sessions`, `list_sessions`, `read_session`, `ask_user`, `synthetic_web_search`, `linkup_web_search`, `linkup_web_answer`, `linkup_web_fetch`
  - Research/review extension tools enabled: `scout`, `lookout`, `oracle`, `reviewer`
  - Side-effecting extension tools blocked: `worker`, `process`
  - Other extension tools confirmation-gated (can allow for session)
  - Provider/model: `openai-codex / gpt-5.4`
  - Thinking: `high`

- `implement`
  - All native and extension tools enabled
  - Provider/model: `anthropic / claude-sonnet-4-6`
  - Thinking: `low`

## Prompt families

Model-family-aware system prompts that tune behavioral patterns per model family. Resolved from the active model's provider and ID.

- `claude` - Light touch for Claude models (good instruction following)
- `openai-codex` - Explicit structure and guardrails for GPT-5.x
- `kimi` - Aggressive concision steering for Kimi K2.5
- `glm` - Structured guidance for GLM-5/GLM-4.7

Mode instructions replace the family prompt when a mode is active. Family prompts serve as fallback when no mode instructions exist.

Resolution order:
1. Provider `openai-codex` or `openai` -> `openai-codex`
2. Provider `anthropic` -> `claude`
3. Model ID containing `kimi` -> `kimi`
4. Model ID containing `glm` -> `glm`
5. Fallback -> `claude`

Requires `<!-- PROMPT_FAMILY -->` marker in `~/.pi/agent/APPEND_SYSTEM.md`. The `system-md-check` hook prompts to create it on first run if missing.

## Controls

- `/mode` opens selector
- `/mode <balanced|plan|implement>` switches directly
- `switch_mode` tool switches between modes with explicit in-tool confirmation
- `Ctrl+U` cycles modes
- `--agent-mode <balanced|plan|implement>` sets startup mode

## Behavior

- Tool access is policy-based:
  - Each tool resolves to `enabled`, `disabled`, or `confirm`
  - `pi.setActiveTools()` includes only `enabled` + `confirm`
  - `tool_call` hook enforces runtime blocking/confirmation
- Mode switch sets model, thinking level, active tools, and system prompt
- Mode state persisted with `appendEntry("mode-state", ...)`
- Restores mode per branch using `sessionManager.getBranch()`
- Mode instructions replace family prompt in system prompt assembly
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
    "plan": {
      "allow": ["read_url", "list_sessions"],
      "deny": ["worker", "process"]
    },
    "balanced": {
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
- Publishes mode label and border band color through editor decoration events
- Editor rendering is owned by the `editor` extension
- Border colors are raw hex values (balanced: `#777777`, plan: `#7a8aa6`, implement: `#99ad6a`)
