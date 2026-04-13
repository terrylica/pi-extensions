# projects

Project initialization extension for Pi.

## Features

### `/projects:init` command

Multi-step wizard to configure packages, skills, and AGENTS.md for the current project.

- Scans catalog directories for available skills and packages
- Multi-select for packages and skills (with auto-lock for bundled skills)
- Nix dev shell configuration (shell.nix or flake.nix)
- AGENTS.md generation with directory targeting and custom prompts
- Detects project tech stack from manifest files

### `/projects:settings` command

Interactive editor for project extension settings:

- `catalog`: directories to scan for skills and packages
- `catalogDepth`: how many directory levels deep to scan
- `childProjectDepth`: depth for detecting child project roots
