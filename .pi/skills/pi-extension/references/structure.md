# Extension Structure

## Directory Layout

```
extensions/<name>/
├── package.json       # Package configuration (pi key for extension entry point)
├── index.ts           # Entry point - exports default function(pi: ExtensionAPI)
├── README.md          # Documentation
├── tools/
│   ├── index.ts       # Hub: exports setup function
│   └── <tool>.ts      # Individual tool definitions
├── components/        # Optional: reusable TUI components (used by tools/commands)
│   ├── index.ts       # Optional: barrel exports
│   └── <component>.ts # TUI Component implementation
├── hooks/             # Optional
│   ├── index.ts       # Hub: exports setup function
│   └── <hook>.ts      # Individual hooks
├── commands/          # Optional
│   ├── index.ts       # Hub: exports register function
│   └── <command>.ts   # Individual command definitions
├── constants/         # Optional: shared types and constants
│   ├── index.ts       # Barrel exports
│   └── types.ts       # Type definitions and constants
├── utils/             # Optional: shared utilities
│   ├── index.ts       # Barrel exports
│   └── <util>.ts      # Utility functions
└── manager.ts         # Optional: state management class
```

## Package Configuration

Every extension needs a `package.json` with the `pi` key declaring the extension entry point:

```json
// extensions/<name>/package.json
{
  "name": "@aliou/pi-<name>",
  "type": "module",
  "private": true,
  "keywords": ["pi-package", "pi-extension"],
  "pi": {
    "extensions": ["./index.ts"]
  }
}
```

- **name**: Scoped under `@aliou/` for this repository
- **type**: `"module"` for ES modules (required for TypeScript extensions)
- **private**: Set to `true` for unpublished extensions; set to `false` when publishing to npm
- **keywords**: Include `"pi-package"` for discoverability on npm
- **pi.extensions**: Array of entry point files (usually just `./index.ts`)

## Entry Point

```typescript
// extensions/<name>/index.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupXxxTools } from "./tools";
import { setupXxxHooks } from "./hooks";      // if hooks exist
import { registerCommands } from "./commands"; // if commands exist

export default function (pi: ExtensionAPI) {
  // If tools share state, create manager and pass to all
  const manager = new SomeManager(); // optional

  setupXxxTools(pi, manager);
  registerCommands(pi, manager);   // optional
  setupXxxHooks(pi, manager);      // optional
}
```

## Tool Hub

```typescript
// extensions/<name>/tools/index.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupFooTool } from "./foo-tool";
import { setupBarTool } from "./bar-tool";

export function setupXxxTools(pi: ExtensionAPI) {
  setupFooTool(pi);
  setupBarTool(pi);
}
```

## Command Hub

```typescript
// extensions/<name>/commands/index.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerFooCommand } from "./foo";
import { registerBarCommand } from "./bar";

export function registerCommands(pi: ExtensionAPI) {
  registerFooCommand(pi);
  registerBarCommand(pi);
}
```

## Workflow

1. Create directory: `extensions/<name>/`
2. Create `package.json` with `pi` key
3. Create `index.ts` entry point
4. Create `tools/index.ts` hub
5. Create individual tool files in `tools/`
6. Add hooks in `hooks/` if needed
7. Add commands in `commands/` if needed
8. Create `README.md`
9. Update root `README.md`
10. Run `pnpm typecheck`
