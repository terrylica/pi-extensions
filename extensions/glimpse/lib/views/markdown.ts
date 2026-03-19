/**
 * Markdown view: renders markdown with syntax-highlighted code blocks.
 */

import { wrapContent } from "../shell";

export interface MarkdownViewOptions {
  markdown: string;
}

export function buildMarkdownHTML(options: MarkdownViewOptions): string {
  const escapedMarkdown = JSON.stringify(options.markdown);

  const bodyHTML = `
<div id="md-content"></div>
<script>
(function() {
  var md = ${escapedMarkdown};
  var el = document.getElementById('md-content');
  el.innerHTML = marked.parse(md, { breaks: true, gfm: true });

  // Highlight code blocks
  el.querySelectorAll('pre code').forEach(function(block) {
    hljs.highlightElement(block);
  });
})();
</script>`;

  return wrapContent(bodyHTML, {
    extraHead: `
<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/nicedoc/highlight.js@master/highlight.pack.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css" media="(prefers-color-scheme: dark)">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css" media="(prefers-color-scheme: light)">`,
    extraCSS: `
/* Markdown typography */
#md-content {
  max-width: 720px;
  margin: 0 auto;
  line-height: 1.7;
}
#md-content h1 { font-size: 24px; margin: 24px 0 12px; }
#md-content h2 { font-size: 20px; margin: 20px 0 10px; }
#md-content h3 { font-size: 16px; margin: 16px 0 8px; }
#md-content p { margin: 8px 0; }
#md-content ul, #md-content ol { margin: 8px 0; padding-left: 24px; }
#md-content li { margin: 4px 0; }
#md-content blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 16px;
  color: var(--text-dim);
  margin: 12px 0;
}
#md-content code {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--surface);
  border-radius: 4px;
  padding: 2px 6px;
}
#md-content pre {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  overflow-x: auto;
  margin: 12px 0;
}
#md-content pre code {
  background: none;
  padding: 0;
  font-size: 13px;
}
#md-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}
#md-content th, #md-content td {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}
#md-content th {
  background: var(--surface);
  font-weight: 600;
}
#md-content img { max-width: 100%; border-radius: var(--radius); }
#md-content a { color: var(--accent); text-decoration: none; }
#md-content a:hover { text-decoration: underline; }
#md-content hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 24px 0;
}
`,
  });
}
