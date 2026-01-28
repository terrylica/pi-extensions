import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export function registerMoonshotProvider(pi: ExtensionAPI): void {
  pi.registerProvider("openrouter-moonshot", {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "OPENROUTER_MOONSHOT_API_KEY",
    api: "openai-completions",
    headers: {
      "X-Title": "Pi",
      "HTTP-Referer": "https://shittycodingagent.ai/",
    },
    models: [
      {
        id: "moonshotai/kimi-k2-0905:exacto",
        name: "Kimi K2 0905 Exacto (OR)",
        reasoning: false,
        input: ["text"],
        cost: {
          input: 0.6,
          output: 2.5,
          cacheRead: 0,
          cacheWrite: 0,
        },
        contextWindow: 262144,
        maxTokens: 16384,
      },
      {
        id: "moonshotai/kimi-k2-thinking",
        name: "Kimi K2 Thinking (OR)",
        reasoning: true,
        input: ["text"],
        cost: {
          input: 0.4,
          output: 1.75,
          cacheRead: 0,
          cacheWrite: 0,
        },
        contextWindow: 262144,
        maxTokens: 65535,
      },
      {
        id: "moonshotai/kimi-k2.5",
        name: "Kimi K2.5 (OR)",
        reasoning: true,
        input: ["text", "image"],
        cost: {
          input: 0.6,
          output: 3,
          cacheRead: 0,
          cacheWrite: 0,
        },
        contextWindow: 262144,
        maxTokens: 262144,
      },
    ],
  });
}
