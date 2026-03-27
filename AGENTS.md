# pi-harness

My personal harness around [Pi](https://github.com/badlogic/pi-mono/) for coding-agent work.

All packages in this repository use the `@aliou` scope where applicable, not `@anthropic` or `@anthropic-ai`.

## Structure

- `extensions/` - Private Pi extensions bundled in this repository
- `integrations/` - Editor and browser integrations such as Neovim and Chrome
- `packages/` - Shared internal package code
- `tests/` - Test utilities and harness. See [tests/README.md](tests/README.md) for usage.

## Extensions

- `breadcrumbs` - Session history tools. Search past sessions, extract information, and hand off context to new sessions.
- `btw` - Owns the custom editor component and event-driven border decorations.
- `defaults` - Personal sensible defaults and quality-of-life improvements.
- `modes` - Hardcoded execution modes with tool gating, model defaults, and branch-aware restore.
- `palette` - Command palette with keyboard-driven UI for running commands and shortcuts.
- `planning` - Turn conversations into implementation plans and manage saved plans.
- `providers` - Register custom providers and show unified rate-limit and usage dashboards.
- `subagents` - Framework for spawning specialized subagents with custom tools, consistent UI rendering, and logging.
- `the-dumb-zone` - Detects when an AI session is degrading and shows a warning overlay.

## Integrations

- `chrome` - Browser automation and sidepanel chat integration.
- `linear` - Hono HTTP server bridging Linear Agent Sessions to Pi SDK sessions.
- `neovim` - Bidirectional integration between Pi and Neovim.

## Development

Uses pnpm workspaces. Nix environment available via `flake.nix`.

```sh
pnpm install
pnpm typecheck
pnpm lint
```

## Notes

- This repo is my private Pi harness infrastructure first. Not every package here is intended to be published as a standalone package.
- Keep repository-level docs focused on my Pi harness. Extension-specific details belong in the extension README files.
