# palette

Keyboard-driven command palette for Pi.

## Features

- Opens with `Ctrl+P`
- Fuzzy picker UI for commands and actions
- Supports built-in palette actions and externally registered commands
- Includes renderers and context filtering for palette-related UI messages

## Entry point

- `Ctrl+P` - Open the command palette

## Notes

- The palette is intentionally exposed as a keyboard shortcut, not a slash command
- External extensions can register additional palette commands through the palette registry events
