# defaults

Sensible defaults and quality-of-life improvements for Pi.

## Layout

- `tools/` - Tool overrides and custom tools (`read`, `edit`, `find`, `bash`, `get_current_time`, `read_url`)
- `hooks/` - Event hooks (event compat bridge)
- `commands/` - Slash commands (`/theme`)
- `components/` - UI components (theme selector)
- `lib/` - Shared logic (tool setup)
- `setup-commands.ts` - Registers extension commands
- `index.ts` - Entry point, wires everything together
