# Usage Extension

Monitor API rate limits and usage statistics.

## Rate Limit Warnings

Automatic notifications when rate limit usage exceeds 60%:

- **On session start**: Shows warnings for any windows above threshold
- **During usage**: Shows once when a window first crosses the threshold
- **On model change**: Resets tracking and shows warnings for new provider

Warnings appear as notifications with severity based on usage level (warning at 60%, error at 80%).

## `/usage` Command

The `/usage` command shows current rate limits and historical usage statistics across four tabs.

## Tabs

- **Session**: Live provider rate-limit windows and status indicators.
- **Today**: Usage totals since midnight.
- **Week**: Usage totals since Monday midnight.
- **All Time**: Usage totals across all sessions.

## Controls

- `Tab` / `→`: Next tab
- `Shift+Tab` / `←`: Previous tab
- `q` / `Escape`: Close

## Requirements

- Claude data requires `anthropic` auth configured.
- Codex data requires `openai-codex` auth configured.

Session statistics are collected from local Pi session files under `~/.pi/agent/sessions`.
