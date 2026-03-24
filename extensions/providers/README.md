# Providers Extension

Rate limiting alerts, usage widgets, and dashboards for AI providers.

## Features

- **Rate Limit Warnings**: Smart, time-aware alerts when approaching limits
- **Usage Bar**: Compact widget showing current provider usage
- **Usage Dashboard**: Interactive `/providers:usage` command for current provider rate limits
- **Codex Fast Mode**: Session-local toggle for OpenAI Codex priority service tier, available from the palette (explicit allowlist of OpenAI priority-compatible GPT-5/Codex families, including `gpt-5.4` and dated snapshots)
- **Codex Verbosity**: Conversation-local OpenAI Codex `text.verbosity` override from the palette, shown in the footer as `🔈`, `🔉`, or `🔊`

## Commands

- `/providers:usage` - Open usage dashboard (interactive)
- `/providers:settings` - Configure provider-specific settings

## Rate Limit Warnings

Warnings trigger based on **projected usage** (current pace extrapolated to window end) combined with absolute usage guards. The thresholds are dynamic:

- **Early in window**: More lenient (need ~33% absolute usage + 260% projected)
- **Late in window**: Stricter (need only ~8% absolute usage + 120% projected)

This prevents spam at window start while ensuring alerts fire before limits are hit.

### Cooldown Behavior

- **Warning (80-90%)**: 60-minute cooldown per window
- **High/Critical (90%+)**: No cooldown - notifies immediately

## Usage Bar Widget

Shows compact rate limit info below the editor. Configurable per-provider:

- `always` - Always visible
- `warnings-only` - Only when usage is elevated (default)
- `never` - Hidden

## Usage Dashboard

Interactive UI with one tab per provider for current rate limits.

- The active session provider is shown first when available
- Each provider tab shows current rate-limit windows and pacing metadata
- No historical usage tabs are currently shown in this dashboard

### Controls

- `Tab/Shift+Tab` - Switch provider tabs
- `j/k` or `↑/↓` - Scroll
- `Space` or `PageDown` - Page down
- `PageUp` - Page up
- `q` or `Esc` - Close

### Provider Tab Layout

```
Status: ● Operational

  Daily tokens
  ████████████████████░░░░░░░░░░░░░░░░░░░░░░ 48%
  proj 89%  14% ahead pace               3h48m remaining
```

The bar shows:
- **Filled portion**: Used percentage
- **│ marker**: Expected pace (where you should be at this point in the window)
- **Color**: Risk level (green/warning/red based on projected usage)

## Configuration

Set per-provider in memory config:

```json
{
  "providers": {
    "anthropic": {
      "widget": "warnings-only",
      "warnings": true
    },
    "openai-codex": {
      "widget": "always",
      "warnings": true
    }
  }
}
```

## Supported Providers

- **Anthropic (Claude)**: Requires `anthropic` auth in Pi
- **OpenAI Codex**: Requires `openai-codex` auth in Pi
- **Synthetic**: Requires `SYNTHETIC_API_KEY` environment variable

## Architecture

### Shared Projection Module

`rate-limits/projection.ts` provides:
- `assessWindowRisk()` - Time-aware risk calculation
- `getPacePercent()` - Window progress calculation
- `getProjectedPercent()` - Extrapolated usage at window end
- `getSeverityColor()` - Map severity to theme colors

Used by both warning hooks and UI rendering for consistent behavior.

### Warning Hook

- Session-local alert state with 60-min cooldown
- Severity escalation tracking (warning → high → critical)
- Non-blocking fetch (fire-and-forget)

### Usage Bar Hook

- Caches rate limits with configurable refresh interval
- Filters Claude windows by model family (Sonnet vs Opus)
- Respects per-provider widget mode
