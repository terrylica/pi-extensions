# btw

Ask quick side questions without interrupting the main session flow.

## Features

- `/btw <question>` command for short side investigations
- Reuses current session context, but filters out prior `btw` messages and in-progress assistant output
- Renders answers as custom bordered messages with provider, model, token, and cost metadata
- Shows a temporary loading widget above the editor while the side question runs

## Command

- `/btw <question>` - Ask a quick side question without interrupting the main agent flow

## Notes

- Requires interactive mode
- Uses the current session model
- Runs as a small subagent invocation with no tools
