---
"@aliou/pi-processes": patch
---

Fix ANSI rendering and output truncation in process tool results.

- Strip ANSI escape codes from tool output rendering to prevent background color artifacts.
- Show "ANSI escape codes were stripped from output" warning when codes were present.
- Truncate output sent to agent context (200 lines / 50KB tail) to avoid flooding context window.
- Append full log file paths in truncation notice.
- Fix widget crash when many processes exceed terminal width.
- Fix /processes panel crash from header scroll suffix and long process names.
