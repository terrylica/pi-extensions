/**
 * Footer component with 2-line layout.
 *
 * Line 1: Path (left) + Stats (right aligned)
 * Line 2: Session name (left) + Model (right aligned)
 */

import type {
  ExtensionAPI,
  ExtensionContext,
  ReadonlyFooterDataProvider,
  Theme,
} from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import {
  AD_PROVIDERS_CODEX_FAST_MODE_CHANGED_EVENT,
  AD_PROVIDERS_CODEX_FAST_MODE_READY_EVENT,
  AD_PROVIDERS_CODEX_FAST_MODE_REQUEST_EVENT,
  AD_PROVIDERS_CODEX_VERBOSITY_CHANGED_EVENT,
  AD_PROVIDERS_CODEX_VERBOSITY_READY_EVENT,
  AD_PROVIDERS_CODEX_VERBOSITY_REQUEST_EVENT,
  type AdProvidersCodexFastModeChangedEvent,
  type AdProvidersCodexVerbosityChangedEvent,
} from "../../../packages/events";
import { buildModelIdLine, buildModelLine } from "../lib/model";
import { buildPathParts } from "../lib/path-parts";
import {
  buildMinimalStatsParts,
  buildStatsParts,
  getContextUsage,
  getCumulativeUsage,
} from "../lib/stats";
import { getTPS, setupTPSTracking } from "../lib/tps";

/**
 * Create a footer component with 2-line layout.
 */
export function createCustomFooter(pi: ExtensionAPI) {
  let ctx: ExtensionContext | undefined;
  setupTPSTracking(pi);
  let requestRender: (() => void) | undefined;
  let codexFastModeEnabled = false;
  let codexVerbosity: "low" | "medium" | "high" | undefined;

  pi.events.on(AD_PROVIDERS_CODEX_FAST_MODE_READY_EVENT, () => {
    if (!ctx) return;
    pi.events.emit(AD_PROVIDERS_CODEX_FAST_MODE_REQUEST_EVENT, { ctx });
  });

  pi.events.on(AD_PROVIDERS_CODEX_VERBOSITY_READY_EVENT, () => {
    pi.events.emit(AD_PROVIDERS_CODEX_VERBOSITY_REQUEST_EVENT, {});
  });

  pi.events.on(AD_PROVIDERS_CODEX_FAST_MODE_CHANGED_EVENT, (data: unknown) => {
    const event = (data ?? {}) as Partial<AdProvidersCodexFastModeChangedEvent>;
    codexFastModeEnabled = event.enabled === true;
    if (!ctx) return;
    requestRender?.();
  });

  pi.events.on(AD_PROVIDERS_CODEX_VERBOSITY_CHANGED_EVENT, (data: unknown) => {
    const event = (data ??
      {}) as Partial<AdProvidersCodexVerbosityChangedEvent>;
    codexVerbosity = event.verbosity;
    if (!ctx) return;
    requestRender?.();
  });

  const renderFooter = (
    width: number,
    theme: Theme,
    footer_data: ReadonlyFooterDataProvider,
  ): string[] => {
    if (!ctx) return [];

    const branch = footer_data.getGitBranch();
    const sessionName = ctx.sessionManager.getSessionName();

    const usage = getCumulativeUsage(ctx);
    const contextUsage = getContextUsage(ctx);
    const tpsStr = getTPS();

    const { parts, width: leftWidth } = buildPathParts(theme, branch);

    const statsParts = buildStatsParts(theme, usage, contextUsage, tpsStr);
    const statsLine = statsParts.join(" ");
    const statsWidth = visibleWidth(statsLine);
    const minPadding = 4;

    const paddingWidth1 = width - leftWidth - statsWidth;
    const padding1 =
      paddingWidth1 > 0
        ? theme.fg("thinkingMinimal", " ".repeat(Math.max(0, paddingWidth1)))
        : "";
    let line1 =
      parts.join("") + padding1 + theme.fg("thinkingMinimal", statsLine);

    const line1Width = visibleWidth(line1);
    let useMinimal = false;

    if (line1Width > width) {
      useMinimal = true;
      const { parts: minimalParts } = buildPathParts(theme, branch, true);
      line1 = minimalParts.join("");
    }

    let line2: string;
    if (useMinimal) {
      const minimalStatsParts = buildMinimalStatsParts(
        theme,
        usage,
        contextUsage,
      );
      const modelIdLine = buildModelIdLine(
        theme,
        ctx.model?.id,
        ctx.model?.provider,
        codexFastModeEnabled,
        codexVerbosity,
      );

      const leftWidth2 = minimalStatsParts.reduce(
        (sum, part) => sum + visibleWidth(part),
        0,
      );
      const modelIdWidth = visibleWidth(modelIdLine);

      const paddingWidth2 = width - leftWidth2 - modelIdWidth;
      const padding2 =
        paddingWidth2 > 0
          ? theme.fg("thinkingMinimal", " ".repeat(Math.max(0, paddingWidth2)))
          : "";

      line2 = minimalStatsParts.join("") + padding2 + modelIdLine;

      if (visibleWidth(line2) > width) {
        line2 = truncateToWidth(modelIdLine, width, "...");
      }
    } else {
      const left_parts2: string[] = [sessionName ?? ""].filter(Boolean);
      const left_parts2_colored = left_parts2.map((s) =>
        theme.fg("thinkingMinimal", s),
      );
      const leftWidth2 = left_parts2.reduce(
        (sum, part) => sum + visibleWidth(part),
        0,
      );

      const thinkingLevel = pi.getThinkingLevel();
      const modelLine = buildModelLine(
        theme,
        ctx.model?.provider,
        ctx.model?.id,
        !!ctx.model?.reasoning,
        thinkingLevel ?? "off",
        codexFastModeEnabled,
        codexVerbosity,
      );
      const modelWidth = visibleWidth(modelLine);

      const paddingWidth2 = width - leftWidth2 - modelWidth;
      const padding2 =
        paddingWidth2 > 0
          ? theme.fg("thinkingMinimal", " ".repeat(Math.max(0, paddingWidth2)))
          : "";
      line2 = left_parts2_colored.join("") + padding2 + modelLine;

      const line2Width = visibleWidth(line2);
      if (line2Width > width) {
        const availableLeft2 = Math.max(0, width - (modelWidth + minPadding));
        if (availableLeft2 > 0) {
          const truncatedLeft2 = truncateToWidth(
            sessionName ?? "",
            availableLeft2,
            "",
          );
          const truncatedLeft2Colored = theme.fg(
            "thinkingMinimal",
            truncatedLeft2,
          );
          const newPadding2 = theme.fg(
            "thinkingMinimal",
            " ".repeat(
              Math.max(0, width - visibleWidth(truncatedLeft2) - modelWidth),
            ),
          );
          line2 = truncatedLeft2Colored + newPadding2 + modelLine;
        } else {
          line2 = truncateToWidth(modelLine, width, "...");
        }
      }
    }

    return [line1, line2];
  };

  return {
    setup: (context: ExtensionContext) => {
      ctx = context;
      pi.events.emit(AD_PROVIDERS_CODEX_FAST_MODE_REQUEST_EVENT, { ctx });
      pi.events.emit(AD_PROVIDERS_CODEX_VERBOSITY_REQUEST_EVENT, {});

      ctx.ui.setFooter((tui, theme, footerData) => {
        requestRender = () => tui.requestRender?.();

        const unsub = footerData.onBranchChange(() => {
          requestRender?.();
        });

        return {
          dispose: () => {
            requestRender = undefined;
            unsub();
          },
          invalidate() {},
          render(width: number): string[] {
            return renderFooter(width, theme, footerData);
          },
        };
      });
    },
    cleanup: () => {
      if (ctx) {
        ctx.ui.setFooter(undefined);
        ctx = undefined;
      }
    },
  };
}
