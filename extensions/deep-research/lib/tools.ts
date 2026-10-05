/**
 * TypeBox tool schemas for structured LLM output.
 *
 * These replace the Zod schemas from deep-research's generateObject() calls.
 * Each tool is used as a single-tool subagent call to extract structured data.
 */

import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// ---------------------------------------------------------------------------
// Schema: submit_queries
// Replaces: searchQueriesSchema from deep-research
// ---------------------------------------------------------------------------

const submitQueriesParams = Type.Object({
	queries: Type.Array(
		Type.Object({
			query: Type.String({ description: "The SERP query" }),
			researchGoal: Type.String({
				description:
					"First talk about the goal of the research that this query is meant to accomplish, then go deeper into how to advance the research once the results are found, mention additional research directions. Be as specific as possible.",
			}),
		}),
		{ description: "List of SERP queries to research the topic" },
	),
});

export function createSubmitQueriesTool(): ToolDefinition<typeof submitQueriesParams> {
	return {
		name: "submit_queries",
		label: "Submit Queries",
		description: "Submit the generated SERP queries for the research topic.",
		parameters: submitQueriesParams,
		async execute(_toolCallId, args, _signal, _onUpdate, _ctx) {
			return {
				content: [{ type: "text" as const, text: JSON.stringify(args) }],
				details: undefined,
			};
		},
	};
}

// ---------------------------------------------------------------------------
// Schema: submit_learnings
// Replaces: searchResultSchema from deep-research
// ---------------------------------------------------------------------------

const submitLearningsParams = Type.Object({
	learnings: Type.Array(Type.String(), {
		description: "List of learnings extracted from the search results",
	}),
	followUpQuestions: Type.Array(Type.String(), {
		description: "Follow-up questions to research the topic further",
	}),
});

export function createSubmitLearningsTool(): ToolDefinition<typeof submitLearningsParams> {
	return {
		name: "submit_learnings",
		label: "Submit Learnings",
		description: "Submit the extracted learnings and follow-up questions from search results.",
		parameters: submitLearningsParams,
		async execute(_toolCallId, args, _signal, _onUpdate, _ctx) {
			return {
				content: [{ type: "text" as const, text: JSON.stringify(args) }],
				details: undefined,
			};
		},
	};
}

// ---------------------------------------------------------------------------
// Schema: submit_feedback
// Replaces: feedbackSchema from deep-research
// ---------------------------------------------------------------------------

const submitFeedbackParams = Type.Object({
	questions: Type.Array(Type.String(), {
		description: "Follow-up questions to clarify the research direction",
	}),
});

export function createSubmitFeedbackTool(): ToolDefinition<typeof submitFeedbackParams> {
	return {
		name: "submit_feedback",
		label: "Submit Feedback",
		description: "Submit follow-up questions to clarify the research direction.",
		parameters: submitFeedbackParams,
		async execute(_toolCallId, args, _signal, _onUpdate, _ctx) {
			return {
				content: [{ type: "text" as const, text: JSON.stringify(args) }],
				details: undefined,
			};
		},
	};
}
