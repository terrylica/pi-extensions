# Specialized Subagents Extension

Framework for spawning specialized subagents with custom tools, consistent UI rendering, and logging.

## Features

- **Custom tools per subagent**: Each subagent has its own tool set
- **Streaming UI**: Tool call progress, spinner animation, markdown rendering
- **Cost tracking**: LLM tokens and external API costs (e.g., Exa)
- **Logging**: Session-like logging in `~/.pi/agent/subagents/`

## Available Subagents

### Scout

Web research assistant. Fetches URLs, searches the web, and accesses GitHub content.

Tools: `fetch_url`, `search`, `github`

## SubagentConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | required | Subagent name (for logging) |
| `model` | `Model` | required | Model instance from registry |
| `systemPrompt` | `string` | required | System prompt |
| `tools` | `AgentTool[]` | `[]` | Built-in tools |
| `customTools` | `ToolDefinition[]` | `[]` | Custom tool definitions |
| `skills` | `Skill[]` | `[]` | Skills to load |
| `thinkingLevel` | `ThinkingLevel` | `"low"` | Thinking level |
| `logging.enabled` | `boolean` | `false` | Enable logging |
| `logging.debug` | `boolean` | `false` | Include raw events |

## SubagentResult

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | Final response text |
| `aborted` | `boolean` | Whether aborted |
| `toolCalls` | `SubagentToolCall[]` | Tool execution history |
| `error` | `string?` | Error message if failed |
| `runId` | `string` | Unique run identifier |
| `logFiles` | `{stream, debug}?` | Log file paths |
| `usage` | `SubagentUsage` | Token and cost info |

## SubagentUsage

| Field | Type | Description |
|-------|------|-------------|
| `inputTokens` | `number?` | Input tokens from API |
| `outputTokens` | `number?` | Output tokens from API |
| `cacheReadTokens` | `number?` | Cache read tokens |
| `cacheWriteTokens` | `number?` | Cache write tokens |
| `estimatedTokens` | `number` | Fallback estimate |
| `llmCost` | `number?` | LLM cost in USD |
| `toolCost` | `number?` | External API cost in USD |
| `totalCost` | `number?` | Total cost (llm + tool) |

## Creating New Subagents

See the `create-specialized-subagent` skill and `subagents/scout/` for reference.
