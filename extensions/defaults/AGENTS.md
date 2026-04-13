# defaults

Personal sensible defaults and quality-of-life improvements for Pi.

## Layout

- `tools/` - Tool overrides and custom tools (`read`, `edit`, `find`, `bash`, `get_current_time`, `read_url`)
- `hooks/` - Event hooks (notifications, terminal title, session naming, header, footer, editor stash, editor shell indicator, palette registration, event compat)
- `commands/` - Slash commands (`/theme`, `/project:init`, `/ad:settings`, `/stash`, `/unstash`)
- `components/` - UI components (theme selector, header, footer)
- `lib/` - Shared logic (title generation, git status, model display, stats, editor stash, tool setup)
- `config.ts` - Extension config schema and loader
- `setup-commands.ts` - Registers extension commands
- `index.ts` - Entry point, wires everything together
