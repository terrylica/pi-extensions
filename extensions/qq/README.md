# qq

Ask quick questions without interrupting the main session flow.

## Features

- `/qq <question>` command for short side investigations
- Reuses current session context, but filters out prior `qq` messages and in-progress assistant output
- Renders answers as custom bordered messages with provider, model, token, and cost metadata
- Shows a temporary loading widget above the editor while the side question runs

## Command

- `/qq <question>` - Ask a quick question without interrupting the main agent flow

## Notes

- Requires interactive mode
- Uses the current session model
- Runs as a small subagent invocation with no tools
