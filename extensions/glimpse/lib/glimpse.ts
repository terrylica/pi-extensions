/**
 * Thin wrapper around glimpseui.
 */

import { open, prompt } from "glimpseui";

interface GlimpseOpenOptions {
  width?: number;
  height?: number;
  title?: string;
  frameless?: boolean;
  floating?: boolean;
  transparent?: boolean;
  autoClose?: boolean;
}

export { open };

/**
 * Show HTML in a glimpse window and wait for user response.
 * Returns the data sent via window.glimpse.send(), or null if closed.
 */
export async function showAndWait(
  html: string,
  options: GlimpseOpenOptions = {},
): Promise<unknown> {
  return prompt(html, { ...options, autoClose: true });
}
