---
"@aliou/pi-guardrails": minor
---

Configurable rules, settings UI, and event-based architecture.

- Config system with global (~/.pi/agent/extensions/guardrails.json) and project (.pi/extensions/guardrails.json) scoped files.
- /guardrails:settings command with sectioned tabbed UI (Local/Global).
- All hooks configurable: feature toggles, patterns, allow/deny lists.
- Emit guardrails:blocked and guardrails:dangerous events (presenter handles sound/notifications).
- Array and pattern editors with add, edit, and delete support.
- preventBrew disabled by default.
