/**
 * Configuration for the project extension.
 */

import { ConfigLoader } from "@aliou/pi-utils-settings";

export interface ProjectConfig {
  catalog?: string[];
  catalogDepth?: number;
  childProjectDepth?: number;
}

export interface ResolvedProjectConfig {
  catalog: string[];
  catalogDepth: number;
  childProjectDepth: number;
}

const DEFAULT_CONFIG: ResolvedProjectConfig = {
  catalog: [],
  catalogDepth: 3,
  childProjectDepth: 2,
};

export const configLoader = new ConfigLoader<
  ProjectConfig,
  ResolvedProjectConfig
>("projects", DEFAULT_CONFIG, {
  scopes: ["global"],
});
