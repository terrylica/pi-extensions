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

/** Model ID for scout subagent */
export const MODEL = "claude-haiku-4-5";
