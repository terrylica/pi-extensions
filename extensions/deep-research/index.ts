/**
 * Deep Research extension for Pi.
 *
 * Registers a `deep_research` tool that performs iterative web research:
 * search → analyze → extract → recurse → synthesize report.
 *
 * Self-contained — only peers on @mariozechner/pi-coding-agent.
 */

import type {
	AgentToolUpdateCallback,
	ExtensionAPI,
	ExtensionContext,
	ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { clampDepth, getConfig, loadConfig } from "./config";
import { deepResearch, type ResearchProgress } from "./lib/research";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeepResearchInput {
	query: string;
	breadth?: number;
	depth?: number;
}

interface DeepResearchDetails {
	query: string;
	breadth: number;
	depth: number;
	progress?: ResearchProgress;
	response?: string;
	aborted?: boolean;
	error?: string;
	usage?: { inputTokens: number; outputTokens: number; llmCost: number };
	totalDurationMs?: number;
	learningsCount?: number;
	sourcesCount?: number;
	queriesSucceeded?: number;
	queriesFailed?: number;
}

// ---------------------------------------------------------------------------
// Tool parameters
// ---------------------------------------------------------------------------

const parameters = Type.Object({
	query: Type.String({
		description: "The research question or topic to investigate in depth",
	}),
	breadth: Type.Optional(
		Type.Number({
			description: "Number of parallel search queries per depth level (default: 4, max reasonable: 8)",
		}),
	),
	depth: Type.Optional(
		Type.Number({
			description: "Number of recursive research iterations (default: 2, max: 5)",
		}),
	),
});

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

function createDeepResearchTool(): ToolDefinition<typeof parameters, DeepResearchDetails> {
	return {
		name: "deep_research",
		label: "Deep Research",
		description: `Perform iterative deep web research on a topic. Searches → analyzes → extracts learnings → searches again recursively, then synthesizes a comprehensive report.

WHEN TO USE:
- Complex research questions requiring multiple search iterations
- Topics where initial results lead to important follow-up questions
- Comparative analyses, state-of-the-art surveys, or technology evaluations

WHEN NOT TO USE:
- Simple factual lookups (use browser-tools)
- Questions answerable from one page
- Code or architecture questions (use oracle)`,

		parameters,

		async execute(
			_toolCallId: string,
			args: DeepResearchInput,
			signal: AbortSignal | undefined,
			onUpdate: AgentToolUpdateCallback<DeepResearchDetails> | undefined,
			ctx: ExtensionContext,
		) {
			const config = getConfig();
			const query = args.query.trim();

			if (!query) {
				throw new Error("Query cannot be empty.");
			}

			const breadth = args.breadth ?? config.defaults.breadth;
			const depth = clampDepth(args.depth ?? config.defaults.depth);

			onUpdate?.({
				content: [{ type: "text", text: "Starting deep research..." }],
				details: { query, breadth, depth },
			});

			const result = await deepResearch(
				query,
				breadth,
				depth,
				config,
				ctx,
				signal,
				(progress) => {
					onUpdate?.({
						content: [{ type: "text", text: progress.status ?? "Researching..." }],
						details: { query, breadth, depth, progress },
					});
				},
			);

			if (signal?.aborted) {
				return {
					content: [{ type: "text" as const, text: "Research aborted." }],
					details: {
						query,
						breadth,
						depth,
						aborted: true,
						usage: result.usage,
						totalDurationMs: result.totalDurationMs,
					},
				};
			}

			return {
				content: [{ type: "text" as const, text: result.report }],
				details: {
					query,
					breadth,
					depth,
					response: result.report,
					usage: result.usage,
					totalDurationMs: result.totalDurationMs,
					learningsCount: result.learnings.length,
					sourcesCount: result.visitedUrls.length,
					queriesSucceeded: result.queriesSucceeded.length,
					queriesFailed: result.queriesFailed.length,
				},
			};
		},
	};
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	loadConfig();
	pi.registerTool(createDeepResearchTool());
}
