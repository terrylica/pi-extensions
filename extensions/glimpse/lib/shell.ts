/**
 * Base HTML shell for all glimpse views.
 *
 * Provides curated color palettes (randomly selected), tab support,
 * CSS utilities, bridge helpers, keyboard shortcuts, and optional action bar.
 */

export interface ShellAction {
  label: string;
  value: string;
  style?: "primary" | "danger" | "default";
}

export interface ShellTab {
  label: string;
  html: string;
}

export interface ShellOptions {
  actions?: ShellAction[];
  tabs?: ShellTab[];
  /** Extra CSS to inject */
  extraCSS?: string;
  /** Extra scripts to inject (CDN links or inline) */
  extraHead?: string;
}

// ── Palettes ──────────────────────────────────────────────────────────────

// Derived from Mindful Palettes MP020, MP019, MP061, MP072.
// Each has dark (direct from palette) and light (inverted) variants.
const PALETTES_JS = `[
  {
    dark: { bg:"#1F282E", surface:"#2a353d", surface2:"#344048", border:"rgba(228,227,220,0.08)", text:"#E4E3DC", dim:"#8a8880", accent:"#FF4E20", secondary:"#B83312", accentSoft:"rgba(255,78,32,0.12)", danger:"#ff6b6b", success:"#7ec97e", warning:"#e0af68" },
    light: { bg:"#E4E3DC", surface:"#DAD8CF", surface2:"#d0cec5", border:"rgba(31,40,46,0.10)", text:"#1F282E", dim:"#6b7580", accent:"#c43a12", secondary:"#B83312", accentSoft:"rgba(196,58,18,0.10)", danger:"#c53030", success:"#2f855a", warning:"#c05621" }
  },
  {
    dark: { bg:"#0B173D", surface:"#12204e", surface2:"#1a2c60", border:"rgba(235,236,240,0.08)", text:"#EBECF0", dim:"#8890b0", accent:"#4466cc", secondary:"#7b88cc", accentSoft:"rgba(68,102,204,0.15)", danger:"#ff6b6b", success:"#7ec97e", warning:"#e0af68" },
    light: { bg:"#EBECF0", surface:"#D6CDEE", surface2:"#CDD6EE", border:"rgba(11,23,61,0.10)", text:"#0B173D", dim:"#5a6080", accent:"#1E42AC", secondary:"#3B4883", accentSoft:"rgba(30,66,172,0.10)", danger:"#c53030", success:"#2f855a", warning:"#c05621" }
  },
  {
    dark: { bg:"#202124", surface:"#2a2d3a", surface2:"#333748", border:"rgba(232,223,213,0.08)", text:"#E8DFD5", dim:"#9a9080", accent:"#FF7124", secondary:"#3B4883", accentSoft:"rgba(255,113,36,0.12)", danger:"#ff6b6b", success:"#7ec97e", warning:"#e0af68" },
    light: { bg:"#E8DFD5", surface:"#DBBBA7", surface2:"#d2b09a", border:"rgba(32,33,36,0.10)", text:"#202124", dim:"#6b6560", accent:"#d45a10", secondary:"#3B4883", accentSoft:"rgba(212,90,16,0.10)", danger:"#c53030", success:"#2f855a", warning:"#c05621" }
  },
  {
    dark: { bg:"#1B2632", surface:"#243040", surface2:"#2C3B4D", border:"rgba(238,233,223,0.08)", text:"#EEE9DF", dim:"#9a9585", accent:"#FFB162", secondary:"#A35139", accentSoft:"rgba(255,177,98,0.12)", danger:"#ff6b6b", success:"#7ec97e", warning:"#e0af68" },
    light: { bg:"#EEE9DF", surface:"#C9C1B1", surface2:"#bfb7a7", border:"rgba(27,38,50,0.10)", text:"#1B2632", dim:"#6a7080", accent:"#c48030", secondary:"#A35139", accentSoft:"rgba(196,128,48,0.10)", danger:"#c53030", success:"#2f855a", warning:"#c05621" }
  }
]`;

// ── Auto-injected libraries ───────────────────────────────────────────────

// Mermaid: loaded as ESM module, initialized after palette is applied.
// The init script runs after DOMContentLoaded so palette CSS vars are set.
const MERMAID_HEAD = `
<style>
/* Mermaid container styling */
pre.mermaid {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  overflow: auto;
  text-align: center;
}
pre.mermaid svg { max-width: 100%; height: auto; }
.mermaid .nodeLabel { font-family: var(--font) !important; color: var(--text) !important; }
.mermaid .edgeLabel { font-family: var(--font-mono) !important; font-size: 12px !important; color: var(--text-dim) !important; background-color: var(--surface) !important; }
.mermaid .edgeLabel rect { fill: var(--surface) !important; }
.mermaid .node rect, .mermaid .node circle, .mermaid .node polygon { stroke-width: 1.5px !important; }
.mermaid .edge-pattern-solid { stroke-width: 1.5px !important; }
</style>`;

const MERMAID_INIT = `
// ── Mermaid auto-init ────────────────────────────────
(function() {
  if (!document.querySelector('pre.mermaid, .mermaid')) return;
  var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var s = getComputedStyle(document.documentElement);
  var fg = s.getPropertyValue('--text').trim();
  var bg = s.getPropertyValue('--bg').trim();
  var surface = s.getPropertyValue('--surface').trim();
  var dim = s.getPropertyValue('--text-dim').trim();
  var accent = s.getPropertyValue('--accent').trim();
  var border = s.getPropertyValue('--border').trim();

  import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')
    .then(function(mod) {
      mod.default.initialize({
        startOnLoad: true,
        theme: 'base',
        themeVariables: {
          primaryColor: surface,
          primaryBorderColor: accent,
          primaryTextColor: fg,
          secondaryColor: isDark ? surface : bg,
          secondaryBorderColor: dim,
          secondaryTextColor: fg,
          lineColor: dim,
          fontSize: '14px',
          fontFamily: s.getPropertyValue('--font').trim(),
          noteBkgColor: surface,
          noteTextColor: fg,
          noteBorderColor: border,
        },
      });
      mod.default.run();
    })
    .catch(function(e) {
      document.querySelectorAll('pre.mermaid, .mermaid').forEach(function(el) {
        el.style.color = 'var(--danger)';
        el.textContent = 'Mermaid failed to load: ' + e.message;
      });
    });
})();`;

// Chart.js: UMD script, agent writes Chart config in inline <script>.
const CHARTJS_HEAD = `<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>`;

// ── Builder ───────────────────────────────────────────────────────────────
export function wrapContent(
  bodyHTML: string,
  options: ShellOptions = {},
): string {
  const { actions, extraCSS, extraHead } = options;

  // Resolve tabs
  const tabs = options.tabs?.length ? options.tabs : null;
  const hasTabs = !!tabs && tabs.length > 1;
  const panels = tabs ?? [{ label: "View", html: bodyHTML }];

  // Auto-detect libraries from tab content
  const allHTML = panels.map((p) => p.html).join("\n");
  const needsMermaid = /class\s*=\s*["']mermaid["'\s]/.test(allHTML);
  const needsChartJS = /<canvas[\s>]/.test(allHTML);

  // Tab bar
  const tabBarHTML = hasTabs
    ? `<div class="g-tab-bar" role="tablist">${panels
        .map(
          (t, i) =>
            `<button class="g-tab${i === 0 ? " is-active" : ""}" role="tab" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-index="${i}">${esc(t.label)}</button>`,
        )
        .join("")}</div>`
    : "";

  // Panels
  const panelsHTML = panels
    .map(
      (t, i) =>
        `<section class="g-tab-panel${i === 0 ? "" : " hidden"}" role="tabpanel" data-panel="${i}">${t.html}</section>`,
    )
    .join("");

  // Action bar
  const actionBarHTML = actions?.length
    ? `<div class="g-action-bar">${actions
        .map(
          (a) =>
            `<button class="btn ${a.style === "primary" ? "btn-primary" : a.style === "danger" ? "btn-danger" : ""}" onclick="send(${escAttr(JSON.stringify(JSON.stringify({ action: a.value })))})">${esc(a.label)}</button>`,
        )
        .join("")}</div>`
    : "";

  const hasActionBar = !!actions?.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${extraHead ?? ""}
${needsMermaid ? MERMAID_HEAD : ""}
${needsChartJS ? CHARTJS_HEAD : ""}
<style>
/* ── Reset ─────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Theme (fallback, overridden by palette JS) ────── */
:root {
  /* Core palette (set by JS, these are fallbacks) */
  --bg: #1B2632;
  --surface: #243040;
  --surface-2: #2C3B4D;
  --border: rgba(238,233,223,0.08);
  --text: #EEE9DF;
  --text-dim: #9a9585;
  --accent: #FFB162;
  --secondary: #A35139;
  --accent-soft: rgba(255,177,98,0.12);
  --danger: #ff6b6b;
  --success: #7ec97e;
  --warning: #e0af68;
  --radius: 8px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Code", monospace;

  /* Semantic aliases -- use these in content HTML */
  --danger-soft: color-mix(in srgb, var(--danger) 15%, var(--bg));
  --success-soft: color-mix(in srgb, var(--success) 15%, var(--bg));
  --warning-soft: color-mix(in srgb, var(--warning) 15%, var(--bg));

  /* Data series for charts (6 distinguishable colors) */
  --data-1: var(--accent);
  --data-2: var(--secondary);
  --data-3: var(--success);
  --data-4: var(--warning);
  --data-5: var(--danger);
  --data-6: var(--text-dim);
}

/* ── Base ──────────────────────────────────────────── */
html, body {
  height: 100%;
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

/* ── Shell layout ──────────────────────────────────── */
.g-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.g-main {
  flex: 1;
  overflow-y: auto;
  ${hasActionBar ? "padding-bottom: 56px;" : ""}
}
.g-tab-panel {
  padding: 20px;
}
.g-tab-panel.hidden { display: none; }

/* ── Tab bar ───────────────────────────────────────── */
.g-tab-bar {
  display: flex;
  gap: 2px;
  padding: 8px 16px 0;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.g-tab {
  padding: 8px 16px;
  font-size: 13px;
  font-family: var(--font);
  font-weight: 500;
  color: var(--text-dim);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  border-radius: 6px 6px 0 0;
}
.g-tab:hover {
  color: var(--text);
  background: var(--accent-soft);
}
.g-tab.is-active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.g-tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* ── Utilities ─────────────────────────────────────── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}
.row { display: flex; gap: 8px; align-items: center; }
.col { display: flex; flex-direction: column; gap: 8px; }
.code {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
}
pre.code {
  padding: 12px;
  overflow-x: auto;
  white-space: pre;
}
.text-dim { color: var(--text-dim); }
.text-sm { font-size: 12px; }
.text-accent { color: var(--accent); }
.text-success { color: var(--success); }
.text-danger { color: var(--danger); }
.text-warning { color: var(--warning); }
.bg-success-soft { background: var(--success-soft); }
.bg-danger-soft { background: var(--danger-soft); }
.bg-warning-soft { background: var(--warning-soft); }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-size: 12px; font-weight: 500; }
.badge-success { background: var(--success-soft); color: var(--success); }
.badge-danger { background: var(--danger-soft); color: var(--danger); }
.badge-warning { background: var(--warning-soft); color: var(--warning); }
.badge-accent { background: var(--accent-soft); color: var(--accent); }
.mt-1 { margin-top: 8px; }
.mt-2 { margin-top: 16px; }
.mb-1 { margin-bottom: 8px; }
.mb-2 { margin-bottom: 16px; }
.gap-1 { gap: 8px; }
.gap-2 { gap: 16px; }
h1 { font-size: 20px; font-weight: 600; }
h2 { font-size: 16px; font-weight: 600; }
h3 { font-size: 14px; font-weight: 600; }

/* ── Buttons ───────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  font-size: 13px;
  font-family: var(--font);
  font-weight: 500;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn:hover { border-color: var(--text-dim); background: var(--surface-2); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn-primary {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
  font-weight: 600;
}
.btn-primary:hover { opacity: 0.9; }
.btn-danger {
  background: var(--danger);
  color: #fff;
  border-color: var(--danger);
}
.btn-danger:hover { opacity: 0.9; }

/* ── Action Bar ────────────────────────────────────── */
.g-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(8px);
}

/* ── Forms ─────────────────────────────────────────── */
input[type="text"], textarea, select {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  font-family: var(--font);
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

${extraCSS ?? ""}
</style>
</head>
<body>
<div class="g-shell">
${tabBarHTML}
<div class="g-main">
${panelsHTML}
</div>
${actionBarHTML}
</div>
<script>
// ── Palette bootstrap ───────────────────────────────
(function() {
  var palettes = ${PALETTES_JS};
  var idx = Math.floor(Math.random() * palettes.length);
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function applyPalette() {
    var p = mq.matches ? palettes[idx].dark : palettes[idx].light;
    var r = document.documentElement.style;
    r.setProperty('--bg', p.bg);
    r.setProperty('--surface', p.surface);
    r.setProperty('--surface-2', p.surface2);
    r.setProperty('--border', p.border);
    r.setProperty('--text', p.text);
    r.setProperty('--text-dim', p.dim);
    r.setProperty('--accent', p.accent);
    r.setProperty('--secondary', p.secondary);
    r.setProperty('--accent-soft', p.accentSoft);
    r.setProperty('--danger', p.danger);
    r.setProperty('--success', p.success);
    r.setProperty('--warning', p.warning);
    document.body.style.background = p.bg;
    document.body.style.color = p.text;
  }

  applyPalette();
  mq.addEventListener('change', applyPalette);
})();

// ── Bridge ──────────────────────────────────────────
function send(data) {
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch {}
  }
  window.glimpse.send(data);
}
function close() { window.glimpse.close(); }
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { window.glimpse.send(null); }
});

// ── Tab switching ───────────────────────────────────
(function() {
  var bar = document.querySelector('.g-tab-bar');
  if (!bar) return;
  var tabs = bar.querySelectorAll('.g-tab');
  var panels = document.querySelectorAll('.g-tab-panel');

  function activate(i) {
    tabs.forEach(function(t, j) {
      t.classList.toggle('is-active', j === i);
      t.setAttribute('aria-selected', j === i ? 'true' : 'false');
      t.setAttribute('tabindex', j === i ? '0' : '-1');
    });
    panels.forEach(function(p, j) {
      p.classList.toggle('hidden', j !== i);
    });
  }

  bar.addEventListener('click', function(e) {
    var btn = e.target.closest('.g-tab');
    if (!btn) return;
    activate(parseInt(btn.dataset.index, 10));
  });

  bar.addEventListener('keydown', function(e) {
    var active = bar.querySelector('.g-tab.is-active');
    var idx = parseInt(active.dataset.index, 10);
    if (e.key === 'ArrowRight') { activate(Math.min(idx + 1, tabs.length - 1)); tabs[Math.min(idx + 1, tabs.length - 1)].focus(); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { activate(Math.max(idx - 1, 0)); tabs[Math.max(idx - 1, 0)].focus(); e.preventDefault(); }
    if (e.key === 'Home') { activate(0); tabs[0].focus(); e.preventDefault(); }
    if (e.key === 'End') { activate(tabs.length - 1); tabs[tabs.length - 1].focus(); e.preventDefault(); }
  });
})();

// ── Auto-focus ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var el = document.querySelector('[autofocus]') || document.querySelector('input, textarea, select');
  if (el) el.focus();
});
${needsMermaid ? MERMAID_INIT : ""}
</script>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
