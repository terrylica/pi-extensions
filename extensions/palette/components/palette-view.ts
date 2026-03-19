/**
 * Internal view contract for the palette shell. Views render content
 * only (no border chrome). The shell draws the shared frame around
 * whichever view is on top of the stack.
 */
export interface PaletteView {
  /** Title shown in the palette frame header. */
  readonly title: string;

  /** Handle keyboard input. Return true if consumed. */
  handleInput(data: string): boolean;

  /**
   * Render content lines (no border). Width is the inner content width.
   * Height is the available inner content height, excluding shell borders.
   */
  renderContent(width: number, height: number): string[];
}
