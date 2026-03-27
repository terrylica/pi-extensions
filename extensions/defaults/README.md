# defaults

Sensible defaults and quality-of-life improvements for Pi.

## Features

### Multi-edit `edit` tool

Overrides the built-in `edit` tool to support both the native single-replacement flow and a gist-style multi-replacement flow.

- Single replace: `path`, `oldText`, `newText`
- Multi replace: `path`, `edits: [{ oldText, newText }]`
- Keeps native fuzzy matching behavior
- Preserves BOM and original line endings (`\r\n` vs `\n`)
- Rejects overlapping or non-unique multi-edit matches

### `get_current_time` tool

Returns the current date and time with structured fields: formatted string, date, time, timezone, timezone name, day of week, and unix timestamp. Supports format parameter: `iso8601` (default), `unix`, `date`, `time`.

### `read_url` tool

Fetches pages as Markdown through a handler pipeline. It uses domain-specific handlers when available (for example, `x.com`/`twitter.com` status URLs via the `api.fxtwitter.com` rendering flow, `github.com` URLs via the GitHub CLI, and `gist.github.com` URLs via the Gist API) and falls back to `https://markdown.new/<url>` for everything else.
### Subdirectory AGENTS.md discovery

Pi's built-in discovery only loads AGENTS.md files from the cwd and its ancestors. This hook fills the gap: when the agent reads a file, it checks for AGENTS.md files in the directories between cwd and the file being read, and sends a custom message for each discovered file.

- Only triggers on `read` tool results (not bash, etc.)
- Sends messages that are visible in the session history (persisted through compaction)
- Collapsed display: "[AGENTS] ~/path/to/AGENTS.md" (accent/bold label, muted path)
- Expanded display: markdown-rendered content of the AGENTS.md file below the header
- Message content is wrapped in `<agents_md>` XML tags with "Automated AGENTS.md file read" prefix
- Deduplicates per session (each AGENTS.md injected at most once)
- Resets on session start/switch
- Skips cwd's own AGENTS.md (already loaded by Pi)
- Falls back to home directory as boundary if file is outside cwd
- Supports global ignore list (`agentsIgnorePaths`) to skip selected AGENTS.md files/directories

### Notifications

Sends OS-level terminal notifications directly (OSC) with optional macOS sounds.

- Plays attention sound when `ask_user` tool is invoked
- For attention/dangerous events, appends ` [!]` to the current terminal title (no emoji)
  - For attention-triggering tool calls (e.g. `ask_user`), marker clears when that tool call finishes
- Sends summary notification when agent finishes (loop count, tool count, error status)
  - Skips done notification when the run ends with assistant `stopReason: "aborted"`
- Listens for `ad:notify:dangerous` events and alerts with attention sound
  - event payload shape: `{ command, description, pattern, toolName?, toolCallId? }`
  - `toolName`/`toolCallId` let title attention map to the exact triggering tool call
  - other extensions can emit this same event to reuse the same attention sound path
- Includes an event compatibility bridge for external extension events
  - currently maps `guardrails:dangerous` -> `ad:notify:dangerous`
  - add future mappings in `extensions/defaults/hooks/event-compat.ts`

### Terminal title

Updates the terminal title with a project breadcrumb (e.g. `pi: project > subdir`) and appends the current activity:

- Session start/switch: `pi: <project breadcrumb>`
- Agent running: `pi: <project breadcrumb> (thinking...)`
- Tool call: `pi: <project breadcrumb> (<tool name>)`
- Session shutdown: resets to "Terminal"

Breadcrumbs are built from the project root (detected via `.git`, `.root`, `pnpm-workspace.yaml`) to the current directory, truncated to 2 levels.


### Auto session naming

Automatically names sessions after the first agent loop whose assistant `stopReason` is `stop`, using both the triggering user message and the assistant response.

Uses `google/gemini-2.5-flash-lite` to generate a 3-7 word title in sentence case.

### Bash with `cwd` parameter

Overrides the built-in `bash` tool to add an optional `cwd` parameter. This avoids fragile `cd dir && command` patterns and fails explicitly when the target directory does not exist.

### System prompt additions

Appends tool usage guidance to the system prompt at agent start. This nudges the model toward better tool choices, such as using `write` instead of `echo` or heredocs, using `read`/`find` instead of shell exploration, and parallelizing independent read-only operations.

### `/theme` command

Theme selector with live preview. Browse all available themes (built-in and custom), preview each one in real-time, and apply with Enter or cancel with Escape to restore the original.

### `/project:init` command

Multi-step wizard to configure packages, skills, and AGENTS.md for the current project.

### `/defaults:settings` command

Interactive editor for the extension's config (catalog paths, ignore paths, etc.).


### Editor stash

In-memory LIFO stack for editor content, modeled after `git stash`. Stash the current editor text to save it for later, then pop it back when needed.

- `ctrl+shift+s` stashes editor content and clears the editor
- `ctrl+shift+r` pops the last stashed content into the editor
- Pop swaps when the editor has content: current text is pushed onto the stash before restoring
- Stash count shown in the footer (warning color) when non-empty
- Also available as `/stash` and `/unstash` palette commands
- Ephemeral: stash is cleared when the session ends
