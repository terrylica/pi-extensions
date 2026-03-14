/**
 * Command palette configuration.
 *
 * Global: ~/.pi/agent/extensions/palette.json
 */

import { ConfigLoader } from "@aliou/pi-utils-settings";

export interface PaletteConfig {
  /** Whether the palette extension is enabled. */
  enabled?: boolean;

  /** File search configuration for path-related commands. */
  fileSearch?: {
    /** Additional root directories to search (relative to cwd or absolute). */
    roots?: string[];

    /** Glob patterns to include. Defaults to all files. */
    includeGlobs?: string[];

    /** Glob patterns to exclude. */
    excludeGlobs?: string[];

    /** Maximum number of files to enumerate. */
    maxFiles?: number;

    /** Maximum file size in bytes for content injection. */
    maxFileSizeBytes?: number;
  };
}

export interface ResolvedPaletteConfig {
  enabled: boolean;

  fileSearch: {
    roots: string[];
    includeGlobs: string[];
    excludeGlobs: string[];
    maxFiles: number;
    maxFileSizeBytes: number;
  };
}

const DEFAULT_CONFIG: ResolvedPaletteConfig = {
  enabled: true,
  fileSearch: {
    roots: ["."],
    includeGlobs: ["**/*"],
    excludeGlobs: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/__pycache__/**",
    ],
    maxFiles: 10000,
    maxFileSizeBytes: 512 * 1024, // 512 KB
  },
};

export const configLoader = new ConfigLoader<
  PaletteConfig,
  ResolvedPaletteConfig
>("palette", DEFAULT_CONFIG, {
  scopes: ["global"],
});
