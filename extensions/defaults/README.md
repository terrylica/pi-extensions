# defaults

Sensible defaults and quality-of-life improvements for Pi.

## Tools

### `bash` with `cwd` parameter

Overrides the built-in bash tool to add an optional `cwd` parameter. This avoids fragile `cd dir && command` patterns and fails explicitly when the target directory does not exist.

Also supports bash spawn hook contributors. Other extensions can register spawn hooks via the `ad:bash:spawn-hook:request` event to compose modifications to the spawn context (e.g. injecting environment variables or wrapping the shell command).

Custom renderers: themed call header with `$ command` display, cwd/timeout indicators, collapsed output with visual-line truncation, truncation warnings, and elapsed duration.

### `read` with directory support

Overrides the built-in read tool to handle directories. If the path is a directory, delegates to the native `ls` tool instead of throwing EISDIR.

### `grep` with custom renderers

Overrides the built-in grep tool with `ToolCallHeader`, `ToolBody`, and `ToolFooter` rendering. Shows the pattern and option flags in the call header. Results are truncated when collapsed (15 lines) with a footer showing match count, limit/truncation warnings, and relative-to path.

### `find` with custom renderers

Overrides the built-in find tool with `ToolCallHeader`, `ToolBody`, and `ToolFooter` rendering. Shows the pattern and search path in the call header. Results are truncated when collapsed (20 lines) with a footer showing result count, limit warnings, and relative-to path.

### `get_current_time`

Returns the current date and time with structured fields: formatted string, date, time, timezone, timezone name, day of week, and unix timestamp. Supports format parameter: `iso8601` (default), `unix`, `date`, `time`.

Custom renderers: themed call header, compact date/time display in result.

### `read_url`

Fetches pages as Markdown through a handler pipeline. Domain-specific handlers for `x.com`/`twitter.com` (via `api.fxtwitter.com`), `github.com` (via GitHub CLI), and `gist.github.com` (via Gist API). Falls back to `markdown.new` for everything else. Attaches inline images from remote URLs.

Custom renderers: themed call header, Markdown rendering with expand/collapse, handler/HTTP status footer.

## Commands

### `/theme`

Theme selector with live preview. Browse all available themes (built-in and custom), preview each one in real-time, and apply with Enter or cancel with Escape to restore the original.

## Hooks

### Event compatibility bridge

Bridges external extension events into harness-native events for backwards compatibility. Currently maps `guardrails:dangerous` -> `ad:notify:dangerous`.
