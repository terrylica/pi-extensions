# Update Pi Extensions

Update this repository's extensions, themes, skills, and other components to use the latest Pi APIs.

## Steps

### 1. Version Check

Get the current Pi version using `pi_version` and compare it with the versions in `./package.json`. The relevant packages are:
- `@mariozechner/pi-ai`
- `@mariozechner/pi-coding-agent`
- `@mariozechner/pi-tui`

Report the current version in package.json vs the installed Pi version.

### 2. Gather Documentation

If there's a version mismatch:
1. Use `pi_changelog` to get changelog entries for versions between current and target
2. Use `pi_docs` to get paths to Pi documentation
3. Read the relevant docs, especially:
   - `docs/extensions.md` for extension API changes
   - Any migration guides or breaking changes noted in changelogs

### 3. Analyze Extensions

For each extension in `./extensions/`:
1. Read the extension's entry point (`index.ts`)
2. Read all tools, commands, and hooks
3. Identify any API usage that needs updating based on changelog/docs
4. Note any deprecated patterns or new recommended approaches
5. Look for custom utility functions that duplicate functionality now available in the Pi SDK (e.g. clipboard helpers, file utilities). If the SDK provides an equivalent, flag it for replacement.

### 4. Analyze Themes

For each theme in `./themes/`:
1. Read the theme entry file
2. Identify any API usage or schema that needs updating based on changelog/docs
3. Note any deprecated patterns or new recommended approaches

### 5. Create Update Plan

Present a detailed plan that includes:
- Package version updates needed in `package.json`
- For each extension:
  - Files that need changes
  - Specific API migrations required
  - Any breaking changes and how to address them
- For each theme:
  - Files that need changes
  - Specific schema or API migrations required
  - Any breaking changes and how to address them
- Any new features from the changelog that could improve existing code
- Custom utilities that can be replaced by SDK exports (remove the local code, switch to the SDK import)

### 6. User Confirmation

Ask for confirmation before proceeding. Wait for feedback. Iterate on the plan based on user input until agreement is reached.

### 7. Execute Updates

Once confirmed:
1. Update the Pi package versions in `./package.json` and any extension/theme `package.json` files (peerDependencies) to the exact version from `pi_version`
2. Apply the planned changes to each extension and theme
3. Run `pnpm install` to update dependencies
4. Run `pnpm typecheck` to verify the changes compile
5. Run `pnpm lint` to check for style issues
6. Report results and any issues encountered

### 8. Commit Changes

After successful verification:
1. Stage only the files changed by the update (package.json, pnpm-lock.yaml, modified extension files, modified theme files)
2. Commit with message format: `chore: update pi packages to X.Y.Z`
3. Include a brief summary of breaking changes addressed in the commit body

## Important

- Use exact versions (e.g., `0.38.0`), not ranges
- Preserve existing functionality while updating to new APIs
- If unsure about a migration, ask for clarification
- Keep changes minimal and focused on API compatibility
