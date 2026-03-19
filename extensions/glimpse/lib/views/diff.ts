/**
 * Diff view: renders side-by-side code diff using diff2html.
 */

import { createTwoFilesPatch } from "diff";
import { wrapContent } from "../shell";

export interface DiffViewOptions {
  oldCode: string;
  newCode: string;
  language?: string;
  oldLabel?: string;
  newLabel?: string;
}

export function buildDiffHTML(options: DiffViewOptions): string {
  const {
    oldCode,
    newCode,
    language,
    oldLabel = "before",
    newLabel = "after",
  } = options;

  const patch = createTwoFilesPatch(
    oldLabel,
    newLabel,
    oldCode,
    newCode,
    "",
    "",
    {
      context: 3,
    },
  );

  // Escape for embedding in JS string
  const escapedPatch = JSON.stringify(patch);

  const bodyHTML = `
<div class="diff-header">
  <span class="text-dim text-sm">${escapeHTML(oldLabel)} &rarr; ${escapeHTML(newLabel)}</span>
</div>
<div id="diff-container"></div>
<div class="diff-footer">
  <button class="btn" onclick="send(null)">Close</button>
</div>
<script>
(function() {
  var patch = ${escapedPatch};
  var lang = ${JSON.stringify(language ?? "")};

  var config = {
    drawFileList: false,
    matching: 'lines',
    outputFormat: 'side-by-side',
    highlight: true,
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  };

  if (lang) {
    config.fileContentToggle = false;
  }

  var target = document.getElementById('diff-container');
  var diff2htmlUi = new Diff2HtmlUI(target, patch, config);
  diff2htmlUi.draw();
  diff2htmlUi.highlightCode();
})();
</script>`;

  return wrapContent(bodyHTML, {
    extraHead: `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html@3/bundles/css/diff2html.min.css">
<script src="https://cdn.jsdelivr.net/npm/diff2html@3/bundles/js/diff2html-ui.min.js"></script>`,
    extraCSS: `
/* Layout */
main { padding: 0; display: flex; flex-direction: column; }
.diff-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
#diff-container { flex: 1; overflow: auto; }
.diff-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* Override diff2html to match shell theme */
.d2h-wrapper { font-family: var(--font-mono); font-size: 13px; }
.d2h-file-header { display: none; }
.d2h-code-side-linenumber { color: var(--text-dim); }
@media (prefers-color-scheme: dark) {
  .d2h-wrapper { --d2h-bg-color: var(--bg); }
  .d2h-file-diff .d2h-code-side-line { background: var(--bg); }
  .d2h-code-side-emptyplaceholder { background: var(--surface); }
  .d2h-del { background-color: rgba(247, 118, 142, 0.1); }
  .d2h-ins { background-color: rgba(158, 206, 106, 0.1); }
  .d2h-info { background: var(--surface); color: var(--text-dim); }
}
`,
  });
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
