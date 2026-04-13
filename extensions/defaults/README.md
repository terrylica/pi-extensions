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

### Bash with `cwd` parameter

Overrides the built-in `bash` tool to add an optional `cwd` parameter. This avoids fragile `cd dir && command` patterns and fails explicitly when the target directory does not exist.

### `/theme` command

Theme selector with live preview. Browse all available themes (built-in and custom), preview each one in real-time, and apply with Enter or cancel with Escape to restore the original.

### Event compatibility bridge

Bridges external extension events into harness-native events for backwards compatibility. Currently maps `guardrails:dangerous` -> `ad:notify:dangerous`.
