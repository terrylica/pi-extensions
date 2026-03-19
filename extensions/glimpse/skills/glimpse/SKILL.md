---
name: glimpse
description: Display rich visual content in native macOS windows. Use when the terminal cannot render what you need to show (diffs, markdown previews, diagrams, charts, forms, interactive choices) or when you need structured user input beyond simple yes/no.
---

# Glimpse -- Native Visual Display

Three tools for showing content in native macOS webview windows. Every tool is blocking and waits for the user to close the window or interact.

## When to use

- Code diffs that need side-by-side comparison with syntax highlighting
- Markdown previews (generated docs, READMEs, formatted content)
- Diagrams: architecture, flowcharts, sequence diagrams (auto-detected mermaid support)
- Rich interactive input: forms, multi-option selections, approval flows
- Visual content: charts, images, HTML previews
- Multi-view displays: use tabs to show several related views in one window

## When NOT to use

- Simple text output -- just print it in the terminal
- Yes/no questions -- use `ask_user` instead
- File contents -- use `read` tool
- Anything that reads fine as plain text

## Tools

### `glimpse_show`

Universal display tool. Content is provided as tabs. Single tab = no tab bar shown. Multiple tabs = tab bar with keyboard navigation.

The shell provides a curated color palette (randomly selected, dark/light adaptive), CSS utilities, and form styles. You only write the content HTML.

**Single view with action buttons:**
```json
{
  "tabs": [{"label": "Confirm", "html": "<h2>Deploy to production?</h2><p class='text-dim'>This will affect 12 services.</p>"}],
  "title": "Confirm Deploy",
  "width": 400,
  "height": 200,
  "actions": [
    {"label": "Cancel", "value": "cancel"},
    {"label": "Deploy", "value": "deploy", "style": "danger"}
  ]
}
```
Returns `{"action": "deploy"}` or `{"action": "cancel"}`, or `null` if Escape/closed.

**Multi-tab display:**
```json
{
  "tabs": [
    {"label": "Overview", "html": "<h2>Project Status</h2><p>Everything is on track.</p>"},
    {"label": "Details", "html": "<h2>Breakdown</h2><ul><li>Task A: done</li><li>Task B: in progress</li></ul>"},
    {"label": "Risks", "html": "<h2>Risk Assessment</h2><p class='text-dim'>No blockers identified.</p>"}
  ],
  "title": "Sprint Review",
  "width": 600,
  "height": 400
}
```

**Custom interactive form (single tab):**
```json
{
  "tabs": [{"label": "Create", "html": "<div class='col gap-2'><h2>New Component</h2><div><label>Name</label><input type='text' id='name' autofocus></div><div><label>Type</label><select id='type'><option>Page</option><option>Component</option></select></div><div class='row' style='justify-content:flex-end'><button class='btn' onclick='send(null)'>Cancel</button><button class='btn btn-primary' onclick='send({name:document.getElementById(\"name\").value, type:document.getElementById(\"type\").value})'>Create</button></div></div>"}],
  "title": "Create",
  "width": 380,
  "height": 280
}
```

**Never hardcode colors.** The shell provides CSS variables that adapt to light/dark mode automatically. Use `var(--text)`, `var(--accent)`, etc. instead of `#ffffff`, `green`, `rgb(...)`. Hardcoded colors will break in the opposite color scheme.

**CSS variables available:**

| Variable | Use for |
|---|---|
| `--bg` | Page background |
| `--surface` | Card/panel backgrounds |
| `--surface-2` | Hover states, nested surfaces |
| `--border` | Borders, dividers |
| `--text` | Primary text |
| `--text-dim` | Secondary/muted text |
| `--accent` | Primary highlight, links |
| `--secondary` | Secondary highlight |
| `--accent-soft` | Accent tinted background |
| `--danger` | Errors, destructive |
| `--success` | OK, positive |
| `--warning` | Caution, in-progress |
| `--danger-soft` | Soft danger background |
| `--success-soft` | Soft success background |
| `--warning-soft` | Soft warning background |
| `--data-1` to `--data-6` | Chart data series colors |

**CSS classes:**
- `.card` -- surface box with border and radius
- `.btn`, `.btn-primary`, `.btn-danger` -- buttons
- `.code`, `pre.code` -- monospace/code blocks
- `.row`, `.col` -- flex layouts
- `.text-dim`, `.text-sm` -- muted/small text
- `.text-accent`, `.text-success`, `.text-danger`, `.text-warning` -- semantic text colors
- `.badge`, `.badge-success`, `.badge-danger`, `.badge-warning`, `.badge-accent` -- status pills
- `.bg-success-soft`, `.bg-danger-soft`, `.bg-warning-soft` -- soft tinted backgrounds
- `.mt-1`, `.mt-2`, `.mb-1`, `.mb-2`, `.gap-1`, `.gap-2` -- spacing

**JS bridge available in HTML:**
- `send(data)` -- send data back to the agent (resolves the tool)
- `close()` -- close the window
- Escape key sends `null` automatically

### Built-in libraries (auto-detected)

The shell auto-detects and loads libraries based on HTML content. No CDN scripts or initialization needed.

**Mermaid diagrams** -- use `<pre class="mermaid">` with standard mermaid syntax. The shell loads mermaid from CDN, initializes it with the current palette colors, and renders it automatically.

```json
{
  "tabs": [{"label": "Architecture", "html": "<pre class='mermaid'>graph TD\n  A[Client] --> B[API Gateway]\n  B --> C[Auth Service]\n  B --> D[User Service]\n  C --> E[(Database)]\n  D --> E</pre>"}],
  "title": "System Architecture"
}
```

Supported: `graph`/`flowchart`, `sequenceDiagram`, `classDiagram`, `stateDiagram-v2`, `erDiagram`, `gantt`, `pie`, `mindmap`, `timeline`.

**Chart.js** -- use `<canvas>` elements. Chart.js is auto-loaded when any `<canvas>` is detected. Write the Chart config in an inline `<script>` tag. Read palette colors from computed styles at runtime -- CSS variables do not work directly in Chart.js config objects.

```json
{
  "tabs": [{"label": "Stats", "html": "<div class='card'><canvas id='c1'></canvas></div><script>(function(){var s=getComputedStyle(document.documentElement);var fg=s.getPropertyValue('--text').trim();var dim=s.getPropertyValue('--text-dim').trim();var accent=s.getPropertyValue('--accent').trim();var grid=s.getPropertyValue('--border').trim();var surface=s.getPropertyValue('--surface').trim();new Chart(document.getElementById('c1'),{type:'bar',data:{labels:['Jan','Feb','Mar','Apr'],datasets:[{label:'Revenue',data:[45,62,78,91],backgroundColor:accent+'cc',borderColor:accent,borderWidth:1,borderRadius:4}]},options:{responsive:true,plugins:{legend:{labels:{color:fg}}},scales:{x:{ticks:{color:dim},grid:{color:grid}},y:{ticks:{color:dim},grid:{color:grid}}}}});})()</script>"}],
  "title": "Revenue"
}
```

Supported chart types: `bar`, `line`, `pie`, `doughnut`, `radar`, `polarArea`, `scatter`, `bubble`.

**Theming pattern for Chart.js** -- always read colors from computed styles:
```javascript
var s = getComputedStyle(document.documentElement);
var fg = s.getPropertyValue('--text').trim();       // axis labels, legend
var dim = s.getPropertyValue('--text-dim').trim();   // tick labels
var accent = s.getPropertyValue('--accent').trim();  // primary data color
var grid = s.getPropertyValue('--border').trim();    // grid lines
var surface = s.getPropertyValue('--surface').trim();// tooltip background
```


### `glimpse_show_diff`

Side-by-side code diff with syntax highlighting.

```json
{
  "old_code": "function greet(name) {\n  return 'Hello ' + name;\n}",
  "new_code": "function greet(name: string): string {\n  return `Hello ${name}`;\n}",
  "language": "typescript",
  "old_label": "greet.js",
  "new_label": "greet.ts",
  "title": "Migration to TypeScript"
}
```

Display only, has a Close button. Returns `null`.

### `glimpse_show_markdown`

Rendered markdown with syntax-highlighted code blocks, tables, images, blockquotes.

```json
{
  "markdown": "# API Reference\n\n## `getUser(id: string)`\n\nReturns the user object.\n\n```typescript\nconst user = await getUser('abc');\n```",
  "title": "API Docs",
  "width": 700,
  "height": 500
}
```

Display only. Returns `null`.

## Tips

- Always handle `null` return (user dismissed without responding)
- Keep windows small and focused -- glimpse is for micro-interactions, not full apps
- Use `actions` parameter for simple choices instead of writing button HTML
- Use multiple tabs to avoid calling the tool multiple times for related content
- For forms, add `autofocus` to the primary input -- the shell auto-focuses it
- Add keyboard shortcuts in custom HTML: Enter to confirm, Escape already cancels
- The shell adapts to system dark/light mode automatically with curated color palettes
- All generated HTML is cached to `$XDG_CACHE_HOME/pi-glimpse/` (shown in tool footer, not sent to LLM)
