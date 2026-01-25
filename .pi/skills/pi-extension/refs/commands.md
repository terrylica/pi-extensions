# Writing Commands

Interactive TUI commands that users invoke with `/commandname`.

## Naming Convention

When an extension has multiple commands, use the format `<extension>:<action>`:

```
/plan:save      # planning extension - save command
/plan:execute   # planning extension - execute command
/git:status     # git extension - status command
/git:commit     # git extension - commit command
```

Use a short prefix (e.g., `plan` instead of `planning`) for brevity. Keep action names concise and descriptive.

For extensions with a single command, use just the extension name: `/myextension`.

## Registration

Register commands immediately in the setup function, not inside event handlers. Check for UI availability inside the handler.

```typescript
// extensions/<name>/commands/index.ts
import type { ExtensionAPI, Theme } from "@mariozechner/pi-coding-agent";
import { type Component, matchesKey } from "@mariozechner/pi-tui";

class MyComponent implements Component {
  constructor(
    private tui: { requestRender: () => void },
    private theme: Theme,
    private onClose: () => void,
  ) {}

  handleInput(data: string): boolean {
    if (matchesKey(data, "escape") || data === "q") {
      this.onClose();
      return true;
    }
    return true;
  }

  invalidate(): void {}

  render(width: number): string[] {
    return ["Line 1", "Line 2"];
  }
}

export function setupXxxCommands(pi: ExtensionAPI) {
  pi.registerCommand("xxx:action", {
    description: "Description for /xxx:action",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) return; // Check UI availability in handler

      await ctx.ui.custom((tui, theme, _keybindings, done) => {
        return new MyComponent(tui, theme, () => done(undefined));
      });
    },
  });
}
```

## Component Interface

Commands use components that implement:

```typescript
interface Component {
  handleInput(data: string): boolean;  // Return true if handled
  invalidate(): void;                   // Called when state changes
  render(width: number): string[];      // Return lines to display
}
```

## Input Handling

Use `matchesKey` for key detection:

```typescript
import { matchesKey } from "@mariozechner/pi-tui";

handleInput(data: string): boolean {
  if (matchesKey(data, "escape")) { /* ... */ }
  if (matchesKey(data, "enter")) { /* ... */ }
  if (matchesKey(data, "up")) { /* ... */ }
  if (matchesKey(data, "down")) { /* ... */ }
  return true;
}
```

## Triggering Re-renders

Call `tui.requestRender()` when state changes:

```typescript
this.selectedIndex++;
this.tui.requestRender();
```
