import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export function registerGoogleProvider(pi: ExtensionAPI): void {
  pi.registerProvider("openrouter-google", {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "OPENROUTER_GOOGLE_API_KEY",
    api: "openai-completions",
    headers: {
      "X-Title": "Pi",
      "HTTP-Referer": "https://shittycodingagent.ai/",
    },
    models: [
      {
        id: "google/gemini-3-pro-preview",
        name: "Gemini 3 Pro Preview (OR)",
        reasoning: true,
        input: ["text", "image"],
        cost: {
          input: 2,
          output: 12,
          cacheRead: 0.2,
          cacheWrite: 0,
        },
        contextWindow: 1000000,
        maxTokens: 64000,
      },
      {
        id: "google/gemini-3-flash-preview",
        name: "Gemini 3 Flash Preview (OR)",
        reasoning: true,
        input: ["text", "image"],
        cost: {
          input: 0.5,
          output: 3,
          cacheRead: 0.05,
          cacheWrite: 0,
        },
        contextWindow: 1048576,
        maxTokens: 65536,
      },
      {
        id: "google/gemini-2.5-flash",
        name: "Gemini 2.5 Flash (OR)",
        reasoning: true,
        input: ["text", "image"],
        cost: {
          input: 0.3,
          output: 2.5,
          cacheRead: 0.075,
          cacheWrite: 0,
        },
        contextWindow: 1048576,
        maxTokens: 65536,
      },
      {
        id: "google/gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite (OR)",
        reasoning: true,
        input: ["text", "image"],
        cost: {
          input: 0.1,
          output: 0.4,
          cacheRead: 0.025,
          cacheWrite: 0,
        },
        contextWindow: 1048576,
        maxTokens: 65536,
      },
      {
        id: "google/gemini-2.0-flash-lite",
        name: "Gemini 2.0 Flash Lite (OR)",
        reasoning: false,
        input: ["text", "image"],
        cost: {
          input: 0.075,
          output: 0.3,
          cacheRead: 0,
          cacheWrite: 0,
        },
        contextWindow: 1048576,
        maxTokens: 8192,
      },
    ],
  });
}
