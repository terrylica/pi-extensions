/**
 * Utility functions for the defaults extension.
 */

/**
 * Format token counts (e.g., "1.2k", "3.4M").
 */
export function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}k`;
}

/**
 * Sanitize text for display in a single-line status.
 * Removes newlines, tabs, and other control characters.
 */
export function sanitizeStatusText(text: string): string {
  return text
    .replace(/[\r\n\t]/g, " ")
    .replace(/ +/g, " ")
    .trim();
}
