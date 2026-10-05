/**
 * Core recursive deep research loop.
 *
 * Ported from dzhng/deep-research, using createAgentSession directly
 * from @mariozechner/pi-coding-agent for structured output via tool calling.
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type {
	ExtensionContext,
	ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import {
	createAgentSession,
	DefaultResourceLoader,
	getAgentDir,
	SessionManager,
	SettingsManager,
} from "@mariozechner/pi-coding-agent";
import pLimit from "p-limit";
import type { ResolvedDeepResearchConfig } from "../config";
import {
	feedbackPrompt,
	finalReportPrompt,
	processResultsPrompt,
	serpQueryPrompt,
	systemPrompt,
} from "./prompts";
import {
	createSubmitFeedbackTool,
	createSubmitLearningsTool,
	createSubmitQueriesTool,
} from "./tools";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResearchProgress {
	currentDepth: number;
	totalDepth: number;
	currentBreadth: number;
	totalBreadth: number;
	currentQuery?: string;
	totalQueries: number;
	completedQueries: number;
	status?: string;
}

export interface ResearchResult {
	learnings: string[];
	visitedUrls: string[];
	queriesSucceeded: string[];
	queriesFailed: string[];
}

export interface ResearchUsage {
	inputTokens: number;
	outputTokens: number;
	llmCost: number;
}

export interface DeepResearchResult {
	report: string;
	learnings: string[];
	visitedUrls: string[];
	queriesSucceeded: string[];
	queriesFailed: string[];
	usage: ResearchUsage;
	totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Simplified subagent executor (self-contained, no @aliou/* deps)
// ---------------------------------------------------------------------------

interface SubagentCallResult {
	content: string;
	toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>;
	aborted: boolean;
	error?: string;
	usage: ResearchUsage;
}

async function runSubagent(
	_name: string,
	sysPrompt: string,
	userMessage: string,
	customTools: ToolDefinition[],
	modelProvider: string,
	modelId: string,
	ctx: ExtensionContext,
	signal?: AbortSignal,
): Promise<SubagentCallResult> {
	const agentDir = getAgentDir();
	const settingsManager = SettingsManager.create(ctx.cwd, agentDir);
	const resourceLoader = new DefaultResourceLoader({
		cwd: ctx.cwd,
		agentDir,
		settingsManager,
		noExtensions: true,
		noPromptTemplates: true,
		noThemes: true,
		noSkills: true,
		systemPromptOverride: () => sysPrompt,
		appendSystemPromptOverride: () => [],
		agentsFilesOverride: () => ({ agentsFiles: [] }),
		skillsOverride: () => ({ skills: [], diagnostics: [] }),
	});
	await resourceLoader.reload();

	const model = ctx.modelRegistry
		.getAvailable()
		.find((m) => m.id === modelId && m.provider === modelProvider);

	if (!model) {
		return {
			content: "",
			toolCalls: [],
			aborted: false,
			error: `Model ${modelProvider}/${modelId} not available`,
			usage: { inputTokens: 0, outputTokens: 0, llmCost: 0 },
		};
	}

	const { session } = await createAgentSession({
		model,
		tools: [],
		customTools,
		sessionManager: SessionManager.inMemory(),
		thinkingLevel: "low",
		modelRegistry: ctx.modelRegistry,
		resourceLoader,
	});

	let accumulated = "";
	let aborted = false;
	const toolCalls: Array<{ toolName: string; args: Record<string, unknown> }> = [];
	const usage: ResearchUsage = { inputTokens: 0, outputTokens: 0, llmCost: 0 };

	const unsubscribe = session.subscribe((event) => {
		if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
			accumulated += event.assistantMessageEvent.delta;
		}
		if (event.type === "tool_execution_start") {
			toolCalls.push({ toolName: event.toolName, args: event.args ?? {} });
		}
		if (event.type === "tool_execution_update") {
			const tc = toolCalls.find((t) => t.toolName === event.toolName);
			if (tc && event.args) tc.args = event.args;
		}
		if (event.type === "turn_end" && event.message.role === "assistant") {
			const msg = event.message as AssistantMessage;
			if (msg.usage) {
				usage.inputTokens += msg.usage.input;
				usage.outputTokens += msg.usage.output;
				usage.llmCost += msg.usage.cost.total;
			}
		}
	});

	if (signal) {
		if (signal.aborted) {
			unsubscribe();
			session.dispose();
			return { content: "", toolCalls: [], aborted: true, usage };
		}
		signal.addEventListener("abort", () => { session.abort(); aborted = true; }, { once: true });
	}

	let error: string | undefined;
	try {
		await session.prompt(userMessage);
	} catch (err) {
		if (signal?.aborted) {
			aborted = true;
		} else {
			error = err instanceof Error ? err.message : String(err);
		}
	} finally {
		unsubscribe();
		session.dispose();
	}

	return { content: accumulated, toolCalls, aborted, error, usage };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple character-based token estimation (conservative). */
function trimToTokenLimit(text: string, maxTokens: number): string {
	if (!text) return "";
	const estimatedTokens = Math.ceil(text.length / 3.5);
	if (estimatedTokens <= maxTokens) return text;
	const maxChars = Math.floor(maxTokens * 3.5 * 0.8);
	return text.slice(0, maxChars);
}

/** Extract structured data from a subagent's tool calls. */
function extractToolArgs<T>(result: SubagentCallResult, toolName: string): T | null {
	const tc = result.toolCalls.find((t) => t.toolName === toolName);
	if (tc) return tc.args as T;
	try {
		return JSON.parse(result.content) as T;
	} catch {
		return null;
	}
}

/** Accumulate usage. */
function addUsage(total: ResearchUsage, add: ResearchUsage): void {
	total.inputTokens += add.inputTokens;
	total.outputTokens += add.outputTokens;
	total.llmCost += add.llmCost;
}

/** Combine abort signal with a timeout. */
function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
	const timeout = AbortSignal.timeout(ms);
	if (!signal) return timeout;
	return AbortSignal.any([signal, timeout]);
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/** Simple Firecrawl HTTP client using fetch(). */
interface FirecrawlSearchResult {
	data: Array<{ url?: string; markdown?: string }> | null;
}

async function firecrawlSearch(
	baseUrl: string,
	apiKey: string,
	query: string,
	options: { timeout?: number; limit?: number },
): Promise<FirecrawlSearchResult> {
	const url = `${baseUrl.replace(/\/+$/, "")}/v1/search`;
	const controller = new AbortController();
	const timeoutId = options.timeout
		? setTimeout(() => controller.abort(), options.timeout)
		: undefined;

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
			},
			body: JSON.stringify({
				query,
				limit: options.limit ?? 5,
				scrapeOptions: { formats: ["markdown"] },
			}),
			signal: controller.signal,
		});

		if (!res.ok) {
			throw new Error(`Firecrawl search failed: ${res.status} ${res.statusText}`);
		}

		return (await res.json()) as FirecrawlSearchResult;
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}
}

interface ResearchContext {
	config: ResolvedDeepResearchConfig;
	ctx: ExtensionContext;
	signal?: AbortSignal;
	onProgress?: (progress: ResearchProgress) => void;
	usage: ResearchUsage;
}

async function generateSerpQueries(
	query: string,
	numQueries: number,
	learnings: string[],
	rctx: ResearchContext,
): Promise<Array<{ query: string; researchGoal: string }>> {
	const result = await runSubagent(
		"deep-research-queries",
		systemPrompt(),
		serpQueryPrompt(query, numQueries, learnings),
		[createSubmitQueriesTool() as unknown as ToolDefinition],
		rctx.config.model.provider,
		rctx.config.model.model,
		rctx.ctx,
		withTimeout(rctx.signal, 30_000),
	);

	addUsage(rctx.usage, result.usage);

	if (result.aborted || result.error) {
		console.warn("generateSerpQueries failed:", result.error ?? "aborted");
		return [];
	}

	const data = extractToolArgs<{ queries: Array<{ query: string; researchGoal: string }> }>(
		result,
		"submit_queries",
	);

	return data?.queries?.slice(0, numQueries) ?? [];
}

async function processSerpResult(
	query: string,
	contents: string[],
	numLearnings: number,
	numFollowUp: number,
	rctx: ResearchContext,
): Promise<{ learnings: string[]; followUpQuestions: string[] }> {
	const trimmedContents = contents.map((c) => trimToTokenLimit(c, 25_000));

	const result = await runSubagent(
		"deep-research-learnings",
		systemPrompt(),
		trimToTokenLimit(processResultsPrompt(query, trimmedContents, numLearnings, numFollowUp), 100_000),
		[createSubmitLearningsTool() as unknown as ToolDefinition],
		rctx.config.model.provider,
		rctx.config.model.model,
		rctx.ctx,
		withTimeout(rctx.signal, 60_000),
	);

	addUsage(rctx.usage, result.usage);

	if (result.aborted || result.error) {
		console.warn("processSerpResult failed:", result.error ?? "aborted");
		return { learnings: [], followUpQuestions: [] };
	}

	const data = extractToolArgs<{ learnings: string[]; followUpQuestions: string[] }>(
		result,
		"submit_learnings",
	);

	return {
		learnings: data?.learnings ?? [],
		followUpQuestions: data?.followUpQuestions ?? [],
	};
}

async function writeFinalReport(
	prompt: string,
	learnings: string[],
	visitedUrls: string[],
	rctx: ResearchContext,
): Promise<string> {
	// No tool needed — plain text response
	const result = await runSubagent(
		"deep-research-report",
		systemPrompt(),
		trimToTokenLimit(finalReportPrompt(prompt, learnings), 100_000),
		[],
		rctx.config.model.provider,
		rctx.config.model.model,
		rctx.ctx,
		withTimeout(rctx.signal, 120_000),
	);

	addUsage(rctx.usage, result.usage);

	if (result.aborted) return "(Report generation was aborted)";
	if (result.error) return `(Report generation failed: ${result.error})`;

	const urlsSection = `\n\n## Sources\n\n${visitedUrls.map((url) => `- ${url}`).join("\n")}`;
	return result.content + urlsSection;
}

export async function generateFeedback(
	query: string,
	numQuestions: number,
	rctx: ResearchContext,
): Promise<string[]> {
	const result = await runSubagent(
		"deep-research-feedback",
		systemPrompt(),
		feedbackPrompt(query, numQuestions),
		[createSubmitFeedbackTool() as unknown as ToolDefinition],
		rctx.config.model.provider,
		rctx.config.model.model,
		rctx.ctx,
		withTimeout(rctx.signal, 30_000),
	);

	addUsage(rctx.usage, result.usage);

	if (result.aborted || result.error) return [];

	const data = extractToolArgs<{ questions: string[] }>(result, "submit_feedback");
	return data?.questions?.slice(0, numQuestions) ?? [];
}

// ---------------------------------------------------------------------------
// Recursive research loop
// ---------------------------------------------------------------------------

async function researchLoop(
	query: string,
	breadth: number,
	depth: number,
	learnings: string[],
	visitedUrls: string[],
	queriesSucceeded: string[],
	queriesFailed: string[],
	totalDepth: number,
	totalBreadth: number,
	rctx: ResearchContext,
): Promise<ResearchResult> {
	if (rctx.signal?.aborted) {
		return { learnings, visitedUrls, queriesSucceeded, queriesFailed };
	}

	const progress: ResearchProgress = {
		currentDepth: depth,
		totalDepth,
		currentBreadth: breadth,
		totalBreadth,
		totalQueries: 0,
		completedQueries: 0,
	};

	const reportProgress = (update: Partial<ResearchProgress>) => {
		Object.assign(progress, update);
		rctx.onProgress?.(progress);
	};

	reportProgress({ status: `Generating ${breadth} search queries (depth ${totalDepth - depth + 1}/${totalDepth})...` });

	const serpQueries = await generateSerpQueries(query, breadth, learnings, rctx);

	if (serpQueries.length === 0) {
		return { learnings, visitedUrls, queriesSucceeded, queriesFailed };
	}

	reportProgress({
		totalQueries: serpQueries.length,
		currentQuery: serpQueries[0]?.query,
	});

	const limit = pLimit(rctx.config.defaults.concurrency);

	const results = await Promise.all(
		serpQueries.map((serpQuery) =>
			limit(async (): Promise<ResearchResult> => {
				if (rctx.signal?.aborted) {
					return {
						learnings: [],
						visitedUrls: [],
						queriesSucceeded: [],
						queriesFailed: [serpQuery.query],
					};
				}

				try {
					reportProgress({
						currentQuery: serpQuery.query,
						status: `Searching: "${serpQuery.query}"`,
					});

					const searchResult = await firecrawlSearch(
						rctx.config.firecrawl.baseUrl,
						rctx.config.firecrawl.apiKey || "",
						serpQuery.query,
						{ timeout: 15_000, limit: 5 },
					);

					const data = searchResult.data ?? [];
					if (data.length === 0) {
						console.warn(`No results for query: ${serpQuery.query}`);
						return {
							learnings: [],
							visitedUrls: [],
							queriesSucceeded: [],
							queriesFailed: [serpQuery.query],
						};
					}

					const newUrls = data.map((item: { url?: string }) => item.url).filter(Boolean) as string[];
					const contents = data
						.map((item: { markdown?: string }) => item.markdown)
						.filter(Boolean) as string[];

					const newBreadth = Math.ceil(breadth / 2);
					const newDepth = depth - 1;

					reportProgress({
						status: `Extracting learnings from "${serpQuery.query}" (${contents.length} pages)...`,
					});

					const extracted = await processSerpResult(
						serpQuery.query,
						contents,
						3,
						newBreadth,
						rctx,
					);

					const allLearnings = [...learnings, ...extracted.learnings];
					const allUrls = [...visitedUrls, ...newUrls];

					if (newDepth > 0) {
						reportProgress({
							currentDepth: newDepth,
							currentBreadth: newBreadth,
							completedQueries: progress.completedQueries + 1,
							status: `Going deeper: breadth=${newBreadth}, depth=${newDepth}`,
						});

						const nextQuery = `Previous research goal: ${serpQuery.researchGoal}
Follow-up research directions: ${extracted.followUpQuestions.map((q) => `\n- ${q}`).join("")}`.trim();

						return researchLoop(
							nextQuery,
							newBreadth,
							newDepth,
							allLearnings,
							allUrls,
							[...queriesSucceeded, serpQuery.query],
							queriesFailed,
							totalDepth,
							totalBreadth,
							rctx,
						);
					}

					reportProgress({
						currentDepth: 0,
						completedQueries: progress.completedQueries + 1,
					});

					return {
						learnings: allLearnings,
						visitedUrls: allUrls,
						queriesSucceeded: [...queriesSucceeded, serpQuery.query],
						queriesFailed,
					};
				} catch (e) {
					const msg = e instanceof Error ? e.message : String(e);
					console.warn(`Error running query "${serpQuery.query}": ${msg}`);
					return {
						learnings: [],
						visitedUrls: [],
						queriesSucceeded: [],
						queriesFailed: [serpQuery.query],
					};
				}
			}),
		),
	);

	return {
		learnings: [...new Set(results.flatMap((r) => r.learnings))],
		visitedUrls: [...new Set(results.flatMap((r) => r.visitedUrls))],
		queriesSucceeded: [...new Set(results.flatMap((r) => r.queriesSucceeded))],
		queriesFailed: [...new Set(results.flatMap((r) => r.queriesFailed))],
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function deepResearch(
	query: string,
	breadth: number,
	depth: number,
	config: ResolvedDeepResearchConfig,
	ctx: ExtensionContext,
	signal?: AbortSignal,
	onProgress?: (progress: ResearchProgress) => void,
): Promise<DeepResearchResult> {
	const startTime = Date.now();

	// E6: Health check Firecrawl before starting
	try {
		await firecrawlSearch(config.firecrawl.baseUrl, config.firecrawl.apiKey || "", "test", {
			timeout: 5_000,
			limit: 1,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return {
			report: `Firecrawl at ${config.firecrawl.baseUrl} is unreachable. Check the service status.\n\nError: ${msg}`,
			learnings: [],
			visitedUrls: [],
			queriesSucceeded: [],
			queriesFailed: [],
			usage: { inputTokens: 0, outputTokens: 0, llmCost: 0 },
			totalDurationMs: Date.now() - startTime,
		};
	}

	const usage: ResearchUsage = { inputTokens: 0, outputTokens: 0, llmCost: 0 };

	const rctx: ResearchContext = {
		config,
		ctx,
		signal,
		onProgress,
		usage,
	};

	onProgress?.({
		currentDepth: depth,
		totalDepth: depth,
		currentBreadth: breadth,
		totalBreadth: breadth,
		totalQueries: 0,
		completedQueries: 0,
		status: "Starting deep research...",
	});

	const result = await researchLoop(query, breadth, depth, [], [], [], [], depth, breadth, rctx);

	// E5: Check for empty learnings
	if (result.learnings.length === 0) {
		const triedQueries = [...result.queriesSucceeded, ...result.queriesFailed];
		return {
			report: `Research found no actionable learnings.\n\nQueries tried: ${triedQueries.length > 0 ? triedQueries.map((q) => `\n- ${q}`).join("") : "(none)"}\n\nConsider broadening the search query.`,
			learnings: [],
			visitedUrls: result.visitedUrls,
			queriesSucceeded: result.queriesSucceeded,
			queriesFailed: result.queriesFailed,
			usage,
			totalDurationMs: Date.now() - startTime,
		};
	}

	onProgress?.({
		currentDepth: 0,
		totalDepth: depth,
		currentBreadth: 0,
		totalBreadth: breadth,
		totalQueries: result.queriesSucceeded.length + result.queriesFailed.length,
		completedQueries: result.queriesSucceeded.length + result.queriesFailed.length,
		status: `Writing final report from ${result.learnings.length} learnings...`,
	});

	const report = await writeFinalReport(query, result.learnings, result.visitedUrls, rctx);

	return {
		report,
		learnings: result.learnings,
		visitedUrls: result.visitedUrls,
		queriesSucceeded: result.queriesSucceeded,
		queriesFailed: result.queriesFailed,
		usage,
		totalDurationMs: Date.now() - startTime,
	};
}
