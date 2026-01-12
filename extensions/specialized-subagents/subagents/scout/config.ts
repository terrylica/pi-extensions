/**
 * Scout subagent configuration.
 */

/** Supported providers for URL fetching */
export type FetchProvider = "exa"; // | "linkup" later

/** Supported providers for web search */
export type SearchProvider = "exa"; // | "linkup" later

/** Active fetch provider */
export const FETCH_PROVIDER: FetchProvider = "exa";

/** Active search provider */
export const SEARCH_PROVIDER: SearchProvider = "exa";

/** Model configuration for scout */
export const MODEL = {
  provider: "opencode",
  model: "claude-haiku-4-5",
} as const;
