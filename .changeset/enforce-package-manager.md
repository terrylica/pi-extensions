---
"@aliou/pi-guardrails": minor
---

Add enforce-package-manager guardrail

- New `enforcePackageManager` feature (disabled by default)
- Supports npm, pnpm, and bun (npm is default)
- Blocks commands using non-selected package managers
- Configurable via `packageManager.selected` setting
- Also documents the existing `preventPython` feature
