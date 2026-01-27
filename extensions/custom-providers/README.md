# Custom Providers Extension

Register custom OpenRouter-based providers with separate API keys for rate limit management and usage tracking.

## Features

- **Multiple OpenRouter Keys**: Define separate providers for different model families (Google, Moonshot, etc.)
- **Per-Key Rate Limits**: Each provider tracks its own limits via OpenRouter API
- **Usage Integration**: Extends the usage extension with OpenRouter rate limit monitoring
- **Easy Configuration**: Simple TypeScript config for models and API keys

## Configured Providers

### OpenRouter Google (`openrouter-google`)
- **API Key**: `OPENROUTER_GOOGLE_API_KEY`
- **Models**:
  - Gemini 3 Pro Preview
  - Gemini 3 Flash Preview
  - Gemini 2.5 Flash
  - Gemini 2.5 Flash Lite

### OpenRouter Moonshot (`openrouter-moonshot`)
- **API Key**: `OPENROUTER_MOONSHOT_API_KEY`
- **Models**:
  - Kimi K2 0905 (exacto)
  - Kimi K2 Thinking
  - Kimi K2.5

## Environment Variables

Set these in your environment or `.env` file:

```bash
OPENROUTER_GOOGLE_API_KEY="sk-or-v1-..."
OPENROUTER_MOONSHOT_API_KEY="sk-or-v1-..."
```

## Usage

Models appear in `/model` selector grouped by provider. The `/usage` command shows OpenRouter rate limits when available.
