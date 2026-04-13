# chrome

Chrome extension for Pi — owns the header, footer, terminal title, notifications, and auto-naming.

## Layout

- `hooks/` - Event hooks (header, footer, terminal title, notification, session naming)
- `components/` - UI components (header, footer)
- `lib/` - Shared logic (git status, model display, path parts, stats, title generation, utils)
- `bin/` - Native binaries (play-alert-sound.swift)
- `index.ts` - Entry point
