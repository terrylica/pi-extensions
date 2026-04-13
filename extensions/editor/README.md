# editor

Editor UI extension for Pi.

This extension owns `setEditorComponent` and renders editor border decorations from shared events.

## Responsibilities

- Install the custom editor component on `session_start` for startup, reload, new, resume, and fork flows
- Emit `ad:editor:ready` when the editor instance is created
- Emit `ad:editor:draft:changed` when draft text changes
- Parse native scroll markers from `super.render(...)` and publish right-side indicators
- Render top and bottom border lines from resolved decoration state
- Shell indicator: publishes `$` + `bashMode` band colors when draft starts with `!` or `!!`
- Editor stash: in-memory LIFO stack for editor text stashing (`ctrl+shift+s` / `ctrl+shift+r`)
- Palette registration: registers stash/unstash commands with the palette extension
- Commands: `/stash` and `/unstash`

## Decoration model

Decorations are published through `ad:editor:border-decoration:changed` with a `source` and `writes`.

- Slot writes target a location: `top-start`, `top-end`, `bottom-start`, `bottom-end`
- Band writes target border color bands: `top` or `bottom`
- Resolution is last-writer-wins per target

This keeps producers decoupled from layout. Extensions publish intent (text and color), while this extension owns rendering.

## Producers in this repo

- `modes`: publishes mode label and mode band colors
- `editor` shell indicator: publishes `$` + `bashMode` band colors when draft starts with `!` or `!!`
- `editor` itself: publishes scroll indicators (`↑ N more ───`, `↓ N more ───`) to end slots
