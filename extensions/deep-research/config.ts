/**
 * Configuration for the deep-research extension.
 *
 * Config file: ~/.pi/agent/extensions/deep-research.json
 * Self-contained — no workspace dependencies.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface DeepResearchModelConfig {
	provider?: string;
	model?: string;
}

export interface FirecrawlConfig {
	baseUrl?: string;
	apiKey?: string;
}

export interface DeepResearchDefaults {
	breadth?: number;
	depth?: number;
	concurrency?: number;
}

export interface DeepResearchConfig {
	model?: DeepResearchModelConfig;
	firecrawl?: FirecrawlConfig;
	defaults?: DeepResearchDefaults;
}

export interface ResolvedDeepResearchConfig {
	model: Required<DeepResearchModelConfig>;
	firecrawl: Required<FirecrawlConfig>;
	defaults: Required<DeepResearchDefaults>;
}

const MAX_DEPTH = 5;

const DEFAULT_CONFIG: ResolvedDeepResearchConfig = {
	model: {
		provider: "anthropic",
		model: "claude-sonnet-4-6",
	},
	firecrawl: {
		baseUrl: "http://localhost:3002", // Firecrawl self-host default; set your own in ~/.pi/agent/extensions/deep-research.json
		apiKey: "",
	},
	defaults: {
		breadth: 4,
		depth: 2,
		concurrency: 2,
	},
};

const CONFIG_PATH = path.join(os.homedir(), ".pi", "agent", "extensions", "deep-research.json");

let resolvedConfig: ResolvedDeepResearchConfig | null = null;

/** Deep merge user config over defaults. */
function mergeConfig(userConfig: DeepResearchConfig): ResolvedDeepResearchConfig {
	return {
		model: {
			provider: userConfig.model?.provider ?? DEFAULT_CONFIG.model.provider,
			model: userConfig.model?.model ?? DEFAULT_CONFIG.model.model,
		},
		firecrawl: {
			baseUrl: userConfig.firecrawl?.baseUrl ?? DEFAULT_CONFIG.firecrawl.baseUrl,
			apiKey: userConfig.firecrawl?.apiKey ?? DEFAULT_CONFIG.firecrawl.apiKey,
		},
		defaults: {
			breadth: userConfig.defaults?.breadth ?? DEFAULT_CONFIG.defaults.breadth,
			depth: userConfig.defaults?.depth ?? DEFAULT_CONFIG.defaults.depth,
			concurrency: userConfig.defaults?.concurrency ?? DEFAULT_CONFIG.defaults.concurrency,
		},
	};
}

/** Load config from disk, merging with defaults. Missing file = defaults only. */
export function loadConfig(): ResolvedDeepResearchConfig {
	try {
		const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
		const parsed = JSON.parse(raw) as DeepResearchConfig;
		resolvedConfig = mergeConfig(parsed);
	} catch {
		resolvedConfig = { ...DEFAULT_CONFIG };
	}
	return resolvedConfig;
}

export function getConfig(): ResolvedDeepResearchConfig {
	if (!resolvedConfig) {
		return loadConfig();
	}
	return resolvedConfig;
}

/** Clamp depth to MAX_DEPTH to prevent recursion explosion. */
export function clampDepth(depth: number): number {
	return Math.max(0, Math.min(depth, MAX_DEPTH));
}
