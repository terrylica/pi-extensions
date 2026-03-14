# Command Palette Extension -- Implementation Plan

## Status

- POC moved to `./tmp/palette-poc/`
- New extension scaffolded in `extensions/palette/` with all files typechecking and linting clean
- Phase 1 structure is in place; command implementations need testing against a live Pi session

## Architecture Overview

The palette follows a **registry + IO interface** pattern inspired by Amp's command palette but adapted to Pi's extension model.

### Core Concepts

1. **Command Registry**: A central list of `PaletteCommand` objects, each self-contained with metadata, visibility guards, and a `run()` method.

2. **IO**: An abstraction layer (`CommandFlowAPI`) that commands use for user interaction. Backed by `ctx.ui.custom()` overlays. Commands never instantiate overlay components directly.

3. **Palette Overlay**: A single fuzzy-filterable list for command discovery. Once a command is selected, its `run()` method takes over and can open further flow screens (pickers, inputs).

4. **Context-Aware Visibility**: Commands declare `isShown()` and `isEnabled()` hooks evaluated at palette-open time. Disabled commands appear dimmed with a reason.

### Why This Design

- **Scalable**: Adding a command means creating one file with a `PaletteCommand` object and importing it in `commands/index.ts`. No switch statements, no overlay modifications.
- **Testable**: Commands depend on `PaletteCommandContext` and `CommandFlowAPI` interfaces, not concrete UI classes.
- **Pi-native**: Uses `ctx.ui.custom()` for overlays, `pi.sendMessage()` for context injection, `pi.exec()` for shell, and `ConfigLoader` for settings.

## File Layout

```
extensions/palette/
  index.ts                          # Entry point: load config, build registry, register command + shortcut
  config.ts                         # ConfigLoader with raw/resolved pattern

  registry/
    types.ts                        # PaletteCommand, CommandFlowAPI, PickItem, etc.
    create-registry.ts              # Builds registry Map from command array

  commands/
    index.ts                        # Central command list (getPaletteCommands)
    open-palette.ts                 # Palette opening logic + CommandView builder
    compact.ts                      # Compact context command
    select-model.ts                 # Provider -> model multi-step picker
    set-session-name.ts             # Text input for session rename
    copy-last-assistant.ts          # Copy last assistant message to clipboard
    run-shell.ts                    # Shell commands (with/without context)

  components/
    palette-overlay.ts              # Main palette list overlay
    fuzzy-picker-overlay.ts         # Generic reusable fuzzy picker
    text-input-overlay.ts           # Generic reusable text input

  flows/
    index.ts                        # createFlowAPI() factory

  hooks/
    renderers.ts                    # Custom message renderers (palette:bash)
    context-filter.ts               # Filter excluded messages from LLM context

  utils/
    session.ts                      # getLastAssistantText and text extraction
    shell.ts                        # formatShellResult
```

## PaletteCommand Interface

```typescript
interface PaletteCommand {
  id: string;                       // Unique ID, e.g. "compact", "model.select"
  title: string;                    // Display title
  description?: string;             // Shown next to title
  aliases?: string[];               // Alternative search terms
  keywords?: string[];              // Hidden search keywords
  shortcutLabel?: string;           // Display-only shortcut hint
  group?: CommandGroup;             // Visual grouping

  isShown?(c): boolean;             // Should it appear? (default: true)
  isEnabled?(c): boolean | { enabled: false; reason?: string };
  getSearchText?(c): string;        // Extra context-dependent search text
  getRankBoost?(c): number;         // Score boost for priority

  run(c, io): Promise<void>;      // Execution entrypoint
}
```

## CommandFlowAPI Interface

```typescript
interface CommandFlowAPI {
  pick(options: PickOptions): Promise<PickResult | null>;
  input(options: InputOptions): Promise<string | null>;
  notify(message: string, level?: "info" | "warning" | "error"): void;
}
```

Commands call `io.pick()` for fuzzy selection, `io.input()` for free text, and `io.notify()` for feedback. Each opens an overlay and returns the result. Returning `null` means the user cancelled.

## How to Add a New Command

1. Create `commands/my-command.ts`:

```typescript
import type { PaletteCommand } from "../registry/types";

export const myCommand: PaletteCommand = {
  id: "my-namespace.action",
  title: "Do Something",
  description: "A helpful description",
  keywords: ["relevant", "search", "terms"],
  group: "session",

  // Optional: hide when not applicable
  isShown(c) {
    return someCondition(c.ctx);
  },

  // Optional: show but grey out with reason
  isEnabled(c) {
    if (!ready(c.ctx)) {
      return { enabled: false, reason: "Not ready yet" };
    }
    return true;
  },

  async run(c, io) {
    // Use io.pick() for selections
    const choice = await io.pick({
      title: "Pick one",
      items: [{ value: "a", label: "Option A" }],
    });
    if (!choice) return;

    // Use io.input() for text entry
    const name = await io.input({ title: "Enter name" });
    if (!name) return;

    // Use Pi APIs for side effects
    c.pi.setSessionName(name);
    io.notify("Done", "info");
  },
};
```

2. Add it to `commands/index.ts`:

```typescript
import { myCommand } from "./my-command";

export function getPaletteCommands(): PaletteCommand[] {
  return [
    // ...existing commands
    myCommand,
  ];
}
```

That is all. No overlay changes, no switch statements, no registry configuration.

## Planned Commands (Not Yet Implemented)

### Append Path (`files.append-path`)

Fuzzy-search files in directories defined in the `fileSearch` config, then append the selected path to the editor's existing content.

- Uses `io.pick()` with file list from `services/file-search.ts`
- Calls `ctx.ui.getEditorText()` + `ctx.ui.setEditorText()` to append
- Paths are relative to `ctx.cwd` for readability
- Config controls search roots, include/exclude globs, and max files

### Insert File Content (`context.insert-file`)

Fuzzy-find a file, read its content, and inject it into the agent context without triggering a turn.

- Uses `io.pick()` for file selection
- Reads file content with size guard from config (`maxFileSizeBytes`)
- Calls `pi.sendMessage()` with `customType: "palette:file-context"` and `display: true`
- Content is formatted with file path header and language-tagged code block
- Needs a custom message renderer in `hooks/renderers.ts`
- Does not modify the editor; does not trigger an agent turn

### File Search Service (`services/file-search.ts`)

Shared by both file commands above.

- Resolves configured roots relative to `ctx.cwd`
- Excludes `.git`, `node_modules`, `dist`, `build`, `.next`, `coverage`, `__pycache__` by default
- Caps total files at `maxFiles` (default 10,000)
- Caches results per cwd+config for ~15 seconds
- Returns normalized `PickItem[]` with relative paths

## Configuration

```json
{
  "enabled": true,
  "fileSearch": {
    "roots": ["."],
    "includeGlobs": ["**/*"],
    "excludeGlobs": ["**/node_modules/**", "**/.git/**"],
    "maxFiles": 10000,
    "maxFileSizeBytes": 524288
  }
}
```

Stored at `~/.pi/agent/extensions/palette.json`.

## Implementation Phases

### Phase 1 (done -- scaffolded)

- Extension structure with registry, IO interface, and all POC commands
- Palette overlay, fuzzy picker, text input overlays
- Bash message renderer and context filter hook
- Config with `enabled` and `fileSearch` fields

### Phase 2 (next)

- File search service
- `files.append-path` command
- `context.insert-file` command with renderer
- Testing against live Pi session

### Phase 3 (future)

- Context-sensitive rank boosts (e.g. `copy` floats up after an assistant message)
- Recently-used command tracking
- Disabled-command visual treatment refinement
- Optional command shortcut labels displayed in palette rows
