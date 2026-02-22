# Specialized Subagents Extension

Framework for spawning specialized subagents with custom tools, consistent UI rendering, and logging.

## Features

- **Custom tools per subagent**: Each subagent has its own tool set
- **Streaming UI**: Tool call progress, spinner animation, markdown rendering
- **Cost tracking**: LLM tokens and external API costs
- **Logging**: Session-like logging in `~/.pi/agent/subagents/`
- **Standalone tools**: Direct access to web fetching without LLM

## Requirements

Environment variables are provider-specific:

| Variable | Description |
|----------|-------------|
| `EXA_API_KEY` | [Exa](https://exa.ai) API key (search + fetch) |
| `LINKUP_API_KEY` | [Linkup](https://linkup.so) API key (search + fetch fallback) |
| `SYNTHETIC_API_KEY` | [Synthetic](https://synthetic.new) API key (search only) |
| `SCOUT_GITHUB_TOKEN` | GitHub personal access token for repository access |

Only keys for enabled/selected providers are needed at runtime.

## Available Subagents

| Subagent | Description | Requirements |
|----------|-------------|--------------|
| Scout | Web research and GitHub codebase exploration. Multi-provider web tools (`web_search`, `web_fetch`) with routing/fallback and Exa-first defaults. | `SCOUT_GITHUB_TOKEN` + provider keys used by your configured order |
| Lookout | Local codebase search by functionality/concept. Uses osgrep for semantic search + grep/find for exact matches. | [osgrep](https://github.com/Ryandonofrio3/osgrep) |
| Oracle | AI advisor powered by GPT-5 for complex reasoning, code reviews, architecture planning, and debugging. | None |
| Reviewer | Code review agent that analyzes diffs and returns structured feedback. Parses diff descriptions, focuses on security/performance/style, and flags issues with priority levels. | None |
| Jester | Generates random, creative, and unexpected content. Useful for creating test data, placeholder content, random names/sentences, or brainstorming unusual ideas. No tools. | None |
| Worker | Focused implementation agent for well-defined tasks on specific files. Reads, edits, writes files and runs bash for verification. Sandboxed to provided files. | None |

## Standalone Tools

| Tool | Description |
|------|-------------|
| `web_search` | Search web with provider routing and fallback. |
| `web_fetch` | Fetch URL content with provider routing and fallback. Returns raw provider content (no summarization/rewrite). |

## Creating New Subagents

See the `create-specialized-subagent` skill and `subagents/scout/` for reference.
