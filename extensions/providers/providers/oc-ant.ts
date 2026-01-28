import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export function registerOcAnthropicProvider(pi: ExtensionAPI): void {
  pi.registerProvider("oc/ant", {
    baseUrl: "https://opencode.ai/zen/v1",
    apiKey: "OPENCODE_API_KEY",
    api: "anthropic-messages",
    models: [
      {
        id: "claude-3-5-haiku",
        name: "Claude Haiku 3.5",
        reasoning: false,
        input: ["text", "image"],
        cost: {
          input: 0.8,
          output: 4,
          cacheRead: 0.08,
          cacheWrite: 1,
        },
        contextWindow: 200000,
        maxTokens: 8192,
      },
      {
        id: "claude-haiku-4-5",
        name: "Claude Haiku 4.5",
        reasoning: true,
        input: ["text", "image"],
        cost: {
          input: 1,
          output: 5,
          cacheRead: 0.1,
          cacheWrite: 1.25,
        },
        contextWindow: 200000,
        maxTokens: 64000,
      },
      {
        id: "claude-sonnet-4-5",
        name: "Claude Sonnet 4.5",
        reasoning: true,
        input: ["text", "image"],
        cost: {
          input: 3,
          output: 15,
          cacheRead: 0.3,
          cacheWrite: 3.75,
        },
        contextWindow: 200000,
        maxTokens: 64000,
      },
      {
        id: "claude-opus-4-5",
        name: "Claude Opus 4.5",
        reasoning: true,
        input: ["text", "image"],
        cost: {
          input: 5,
          output: 25,
          cacheRead: 0.5,
          cacheWrite: 6.25,
        },
        contextWindow: 200000,
        maxTokens: 64000,
      },
    ],
  });
}
