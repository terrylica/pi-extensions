---
"@aliou/pi-utils-settings": minor
---

Add a reusable `SettingsDetailEditor` component for focused second-level settings editing.

- Support typed detail fields: text, enum, boolean, nested submenu, and destructive action with confirmation
- Add keyboard UX for detail panels (`↑/↓` or `j/k`, `Enter`, `Esc`)
- Show selected field descriptions and keep nested submenu handoff/return clean
- Add tests for navigation and field callback behavior
- Update docs with guidance on `SectionedSettings` vs `SectionedSettings + SettingsDetailEditor`
- Extend reference example with an array-of-objects pattern (`profiles`) using nested detail editors
