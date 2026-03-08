import type { Theme } from "@mariozechner/pi-coding-agent";
import { visibleWidth } from "@mariozechner/pi-tui";

interface PathPartsResult {
  parts: string[];
  width: number;
}

/**
 * Build path and branch parts for footer line 1 left side
 * @param minimal - If true, only show project name + branch (for small screens)
 */
export function buildPathParts(
  theme: Theme,
  branch: string | null | undefined,
  minimal: boolean = false,
): PathPartsResult {
  let cwd = process.cwd();
  const home = process.env.HOME || process.env.USERPROFILE;
  let isHome = false;

  if (home && cwd.startsWith(home)) {
    cwd = cwd.slice(home.length);
    isHome = true;
  }

  const segments = cwd.split("/").filter((s) => s.length > 0);
  const parts: string[] = [];

  if (segments.length > 0) {
    const last_index = segments.length - 1;
    const last_segment = segments[last_index];

    if (!minimal) {
      const all_middle = segments.slice(0, last_index);
      const middle_segments = all_middle.slice(0, 2);

      if (middle_segments.length > 0) {
        const middle_truncated = middle_segments
          .map((s) => s[0] ?? "")
          .join("/");
        parts.push(
          isHome
            ? theme.fg("thinkingMinimal", `~/${middle_truncated}/`)
            : theme.fg("thinkingMinimal", `${middle_truncated}/`),
        );
      } else if (isHome) {
        parts.push(theme.fg("thinkingMinimal", "~/"));
      }
    }

    if (last_segment) {
      parts.push(last_segment);
    }

    const minimalSpace = theme.fg("thinkingMinimal", " ");
    if (branch) {
      const isMainBranch = branch === "main";
      const minimalOpenBracket = theme.fg("thinkingMinimal", "[");
      const minimalCloseBracket = theme.fg("thinkingMinimal", "]");
      if (isMainBranch) {
        parts.push(
          minimalSpace,
          minimalOpenBracket,
          theme.fg("thinkingMinimal", branch),
          minimalCloseBracket,
        );
      } else {
        parts.push(
          minimalSpace,
          minimalOpenBracket,
          theme.fg("accent", branch),
          minimalCloseBracket,
        );
      }
    }
  }

  const width = parts.reduce((sum, part) => sum + visibleWidth(part), 0);

  return { parts, width };
}
