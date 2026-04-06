# modes

Hardcoded mode system for Pi with prompt families, tool policy, and model switching.

## Modes

- `balanced`: all tools, Kimi K2.5 NVFP4, low thinking. Default mode.
- `plan`: read-only + research tools, GPT-5.4, high thinking.
- `implement`: all tools, Sonnet 4.6, low thinking.

## Prompt families

- `claude`, `openai-codex`, `kimi`, `glm` -- resolved from model provider/ID.
- Mode instructions replace the family prompt (not append).
- Requires `<!-- PROMPT_FAMILY -->` marker in `~/.pi/agent/APPEND_SYSTEM.md`.

## Controls

- `/mode`, `/mode <name>`, `Ctrl+U` cycle, `--agent-mode <name>`

## Notes

- No config file and no `enabled` toggle by design.
- Uses `tool_call` hook for enforcement and `setActiveTools` for activation from policy.
- Persists mode per branch via custom `mode-state` entries.
- Mode switch sets model, thinking level, active tools, and system prompt.
- Sends `mode-switch` UI messages and filters them from LLM context.
- Border colors are raw hex (editor extension converts to ANSI RGB).
