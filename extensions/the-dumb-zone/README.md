# The Dumb Zone

Shows a warning overlay when the agent response contains specific phrases.

## Features

- **Hook**: Watches agent responses and shows an overlay with a red warning message.
- **Regex matching**: Phrases are stored as regular expressions in a constant.

## Usage

Enable the extension and it will automatically scan assistant responses. When a match is found, it shows an overlay with:

```
YOU HAVE ENTERED THE DUMB ZONE
```

## Configuration

Update the match patterns in `extensions/the-dumb-zone/constants.ts`:

```ts
export const DUMB_ZONE_PATTERNS: readonly RegExp[] = [
  /excellent catch/i,
  /good\s+catch/i,
  /you are absolutely right/i,
];
```

## Requirements

- None.
