import { CustomEditor, type Theme } from "@mariozechner/pi-coding-agent";
import type { ModeDefinition } from "../modes";

export class ModeEditor extends CustomEditor {
  public appTheme?: Theme;
  public modeProvider?: () => ModeDefinition;

  override render(width: number): string[] {
    const lines = super.render(width);
    const mode = this.modeProvider?.();

    if (!mode || width < 10 || lines.length === 0) {
      return lines;
    }

    const label = mode.label || mode.name;
    const prefix = "── ";
    const suffix = " ";
    const fillLen = width - prefix.length - label.length - suffix.length;
    if (fillLen < 1) return lines;

    const colorFn = (text: string) => mode.labelColor(text, this.appTheme);
    const fill = "─".repeat(fillLen);

    lines[0] = `${colorFn(prefix)}${colorFn(label)}${colorFn(`${suffix}${fill}`)}`;

    if (lines.length > 1) {
      lines[lines.length - 1] = colorFn("─".repeat(width));
    }

    return lines;
  }

  requestRenderNow(): void {
    this.tui.requestRender();
  }
}
