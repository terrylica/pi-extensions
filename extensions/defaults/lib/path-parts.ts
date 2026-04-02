import type { Theme } from "@mariozechner/pi-coding-agent";
import { visibleWidth } from "@mariozechner/pi-tui";

interface PathPartsResult {
  /** The styled path string (project name only). */
  path: string;
  pathWidth: number;
  /** The styled branch string (plain, no brackets). Undefined when no branch. */
  branch?: string;
  branchWidth: number;
  /** Total visible width of path + separator + branch. */
  width: number;
}

/**
 * Build path and branch parts for the footer.
 *
 * Path is always the last directory segment (project name).
 * Branch is plain text, no brackets. Main branch is dimmed, others use accent.
 */
export function buildPathParts(
  theme: Theme,
  branch: string | null | undefined,
): PathPartsResult {
  let cwd = process.cwd();
  const home = process.env.HOME || process.env.USERPROFILE;

  if (home && cwd.startsWith(home)) {
    cwd = cwd.slice(home.length);
  }

  const segments = cwd.split("/").filter((s) => s.length > 0);
  const projectName = segments[segments.length - 1] ?? "";

  const pathPart = projectName;
  const pathWidth = visibleWidth(pathPart);

  let branchPart: string | undefined;
  let branchWidth = 0;
  const separatorWidth = 1; // space between path and branch

  if (branch) {
    const isMainBranch = branch === "main";
    branchPart = isMainBranch
      ? theme.fg("thinkingMinimal", branch)
      : theme.fg("accent", branch);
    branchWidth = visibleWidth(branch);
  }

  const totalWidth = branchPart
    ? pathWidth + separatorWidth + branchWidth
    : pathWidth;

  return {
    path: pathPart,
    pathWidth,
    branch: branchPart,
    branchWidth,
    width: totalWidth,
  };
}
