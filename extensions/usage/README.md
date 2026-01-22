# Usage Extension

Monitor API rate limits and usage statistics.

## Usage Bar Widget

Shows a compact bar below the editor with per-window usage, a pace marker (│) for rolling windows, and projection-based colors (green/yellow/red). Colors are driven by projected usage, not current usage, to avoid false alerts when you are behind pace.

## Rate Limit Warnings

Automatic notifications when projected usage is trending over the window limit. Projection uses the pace indicator (elapsed time in the window) with a 5% minimum pace floor to avoid extreme early-window spikes:

```
projectedPercent = usedPercent / max(pacePercent, 5%)
```

Thresholds (based on projected percent):

- **Warning**: ≥ 80%
- **High**: ≥ 90% (error severity)
- **Critical**: ≥ 100% (error severity)

Notifications:

- **On session start**: Shows warnings for any windows above threshold
- **During usage**: Shows once when a window first crosses the threshold
- **On model change**: Resets tracking and shows warnings for new provider

## `/usage` Command

The `/usage` command shows current rate limits and historical usage statistics across four tabs. Rate-limit bars include a pace marker (│) indicating how far through the rolling window you are.

## Tabs

- **Session**: Live provider rate-limit windows and status indicators with pace markers.
- **Today**: Usage totals since midnight with a period-progress bar.
- **Week**: Usage totals since Monday midnight with a period-progress bar.
- **All Time**: Usage totals across all sessions.

## Controls

- `Tab` / `→`: Next tab
- `Shift+Tab` / `←`: Previous tab
- `q` / `Escape`: Close

## Requirements

- Claude data requires `anthropic` auth configured.
- Codex data requires `openai-codex` auth configured.

Session statistics are collected from local Pi session files under `~/.pi/agent/sessions`.
