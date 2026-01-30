/**
 * Git Rebase Helper Hook
 *
 * Helps agents successfully run git rebase commands in non-interactive
 * contexts where no editor is available.
 *
 * When a git rebase command is detected that would hang (interactive rebase)
 * or open an editor (rebase --continue), this hook blocks the command and
 * provides guidance on the correct syntax.
 *
 * Based on session analysis, agents struggle with:
 * 1. git rebase -i hanging because it tries to open an interactive editor
 * 2. git rebase --continue opening a commit message editor
 * 3. Platform-specific sed syntax differences in workarounds
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// Patterns to detect git rebase commands
const GIT_REBASE_PATTERN = /git\s+rebase/i;
const REBASE_INTERACTIVE_PATTERN = /git\s+rebase\s+(-i|--interactive)/i;
const REBASE_CONTINUE_PATTERN = /git\s+rebase\s+--continue/i;

/**
 * Check if a command is a git rebase command
 */
function isGitRebaseCommand(command: string): boolean {
  return GIT_REBASE_PATTERN.test(command);
}

/**
 * Check if this is an interactive rebase
 */
function isInteractiveRebase(command: string): boolean {
  return REBASE_INTERACTIVE_PATTERN.test(command);
}

/**
 * Check if this is a rebase --continue
 */
function isRebaseContinue(command: string): boolean {
  return REBASE_CONTINUE_PATTERN.test(command);
}

/**
 * Check if command already has editor-related env vars or flags
 */
function hasEditorConfiguration(command: string): boolean {
  return /GIT_SEQUENCE_EDITOR|GIT_EDITOR|core\.editor/.test(command);
}

export function setupGitRebaseHook(pi: ExtensionAPI): void {
  pi.on("tool_call", async (event, _ctx) => {
    // Only handle bash tool calls
    if (event.toolName !== "bash") {
      return undefined;
    }

    const command = event.input?.command as string | undefined;
    if (!command) {
      return undefined;
    }

    // Check if this is a git rebase command
    if (!isGitRebaseCommand(command)) {
      return undefined;
    }

    // Skip if already properly configured
    if (hasEditorConfiguration(command)) {
      return undefined;
    }

    // Block and provide guidance based on the type of rebase
    if (isInteractiveRebase(command)) {
      return {
        block: true,
        reason: `Interactive git rebase requires an editor, which is not available in this environment.

Use this instead:
  GIT_SEQUENCE_EDITOR=: GIT_EDITOR=true ${command}

The GIT_SEQUENCE_EDITOR=: sets the sequence editor to a no-op command (":" is a shell built-in that does nothing and exits successfully), which accepts the default rebase sequence without opening an editor.

If you need to modify the rebase sequence programmatically, create a script and use it as the GIT_SEQUENCE_EDITOR.`,
      };
    }

    if (isRebaseContinue(command)) {
      return {
        block: true,
        reason: `git rebase --continue may open a commit message editor, which is not available in this environment.

Use one of these instead:
  GIT_EDITOR=true ${command}
  git -c core.editor=true ${command}
  git rebase --continue --no-edit

The --no-edit flag (Git 2.14+) keeps the original commit message without opening an editor.`,
      };
    }

    // For other rebase commands (abort, skip, etc.)
    return {
      block: true,
      reason: `git rebase commands may open an editor in this environment.

Use this instead:
  GIT_EDITOR=true ${command}

Or use git -c core.editor=true:
  git -c core.editor=true ${command}`,
    };
  });
}
