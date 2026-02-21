/**
 * TUI wizard for /project:init.
 *
 * Three-step wizard using the Wizard component from @aliou/pi-utils-settings:
 * 1. Packages — multi-select packages from the catalog
 * 2. Skills — multi-select skills (skills bundled with checked packages are locked)
 * 3. AGENTS.md — toggle generation and pick target directories
 *
 * Ctrl+S to apply, Esc to cancel.
 */

import {
  FuzzyMultiSelector,
  type FuzzyMultiSelectorItem,
  Wizard,
  type WizardStepContext,
} from "@aliou/pi-utils-settings";
import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import type { Component, SettingsListTheme } from "@mariozechner/pi-tui";
import { Key, matchesKey } from "@mariozechner/pi-tui";
import type { CatalogEntry } from "./catalog";
import { scanCatalog } from "./catalog";
import { getInstalled, readSettings } from "./installer";
import { findChildProjects, type ProjectStack, scanProject } from "./scanner";

export interface WizardResult {
  selectedEntries: CatalogEntry[];
  unselectedEntries: CatalogEntry[];
  generateAgents: boolean;
  agentsDirs: string[];
  stack: ProjectStack;
}

// ---------------------------------------------------------------------------
// Shared mutable state across wizard steps
// ---------------------------------------------------------------------------

interface WizardState {
  catalog: CatalogEntry[];
  stack: ProjectStack;
  installedSkills: Set<string>;
  installedPackages: Set<string>;

  // Items mutated by steps
  packageItems: FuzzyMultiSelectorItem[];
  skillItems: FuzzyMultiSelectorItem[];
  generateAgents: boolean;
  agentsDirItems: Array<{ path: string; checked: boolean }>;
}

// ---------------------------------------------------------------------------
// Step 1: Packages
// ---------------------------------------------------------------------------

class PackagesStep implements Component {
  private selector: FuzzyMultiSelector;

  constructor(
    state: WizardState,
    settingsTheme: SettingsListTheme,
    wizardCtx: WizardStepContext,
  ) {
    // Always valid (0 packages is fine)
    wizardCtx.markComplete();

    this.selector = new FuzzyMultiSelector({
      label: "Packages",
      items: state.packageItems,
      theme: settingsTheme,
      onToggle: () => {
        // Recompute skill locks when packages change
        recomputeSkillLocks(state);
      },
    });
  }

  render(width: number): string[] {
    return this.selector.render(width);
  }

  invalidate(): void {
    this.selector.invalidate?.();
  }

  handleInput(data: string): void {
    if (matchesKey(data, Key.escape)) return;
    this.selector.handleInput(data);
  }
}

// ---------------------------------------------------------------------------
// Step 2: Skills
// ---------------------------------------------------------------------------

class SkillsStep implements Component {
  private selector: FuzzyMultiSelector;

  constructor(
    private state: WizardState,
    settingsTheme: SettingsListTheme,
    wizardCtx: WizardStepContext,
  ) {
    wizardCtx.markComplete();

    // Ensure locks are current when entering this step
    recomputeSkillLocks(state);

    this.selector = new FuzzyMultiSelector({
      label: "Skills",
      items: state.skillItems,
      theme: settingsTheme,
    });
  }

  render(width: number): string[] {
    // Re-apply locks every render in case packages changed via tab navigation
    recomputeSkillLocks(this.state);
    this.selector.refresh();
    return this.selector.render(width);
  }

  invalidate(): void {
    this.selector.invalidate?.();
  }

  handleInput(data: string): void {
    if (matchesKey(data, Key.escape)) return;
    this.selector.handleInput(data);
  }
}

// ---------------------------------------------------------------------------
// Step 3: AGENTS.md
// ---------------------------------------------------------------------------

/** Max visible directory rows in the AGENTS.md step. */
const AGENTS_MAX_VISIBLE = 14;

class AgentsStep implements Component {
  private settingsTheme: SettingsListTheme;
  private selectedIndex = 0;

  constructor(
    private state: WizardState,
    settingsTheme: SettingsListTheme,
    wizardCtx: WizardStepContext,
  ) {
    this.settingsTheme = settingsTheme;
    wizardCtx.markComplete();
  }

  private get totalItems(): number {
    return this.state.generateAgents ? 1 + this.state.agentsDirItems.length : 1;
  }

  render(_width: number): string[] {
    const lines: string[] = [];

    lines.push(this.settingsTheme.label(" AGENTS.md", true));
    lines.push("");

    // Toggle for generation
    const genCheck = this.state.generateAgents ? "[x]" : "[ ]";
    const isGenSelected = this.selectedIndex === 0;
    const genPrefix = isGenSelected ? this.settingsTheme.cursor : "  ";
    const genText = this.settingsTheme.value(
      `${genCheck} Generate / update AGENTS.md`,
      isGenSelected,
    );
    lines.push(`${genPrefix}${genText}`);
    lines.push("");

    // Directory list
    if (this.state.generateAgents && this.state.agentsDirItems.length > 0) {
      const checkedCount = this.state.agentsDirItems.filter(
        (d) => d.checked,
      ).length;
      lines.push(
        this.settingsTheme.hint(
          `  Target directories (${checkedCount}/${this.state.agentsDirItems.length} selected):`,
        ),
      );
      lines.push("");

      const dirCount = this.state.agentsDirItems.length;
      const dirCursor = this.selectedIndex - 1;

      const startIndex = Math.max(
        0,
        Math.min(
          dirCursor - Math.floor(AGENTS_MAX_VISIBLE / 2),
          dirCount - AGENTS_MAX_VISIBLE,
        ),
      );
      const endIndex = Math.min(startIndex + AGENTS_MAX_VISIBLE, dirCount);

      for (let i = startIndex; i < endIndex; i++) {
        const item = this.state.agentsDirItems[i];
        if (!item) continue;

        const listIndex = i + 1;
        const isSelected = this.selectedIndex === listIndex;
        const prefix = isSelected ? this.settingsTheme.cursor : "  ";
        const check = item.checked ? "[x]" : "[ ]";
        const label = this.settingsTheme.value(
          `${check} ${item.path}`,
          isSelected,
        );
        lines.push(`${prefix}${label}`);
      }

      // Scroll indicator
      if (dirCount > AGENTS_MAX_VISIBLE) {
        const pos = Math.max(0, dirCursor);
        lines.push(this.settingsTheme.hint(`  (${pos + 1}/${dirCount})`));
      }
    }

    lines.push("");
    lines.push(this.settingsTheme.hint("  Space toggle · Ctrl+S submit"));

    return lines;
  }

  invalidate(): void {}

  handleInput(data: string): void {
    if (matchesKey(data, Key.escape)) return;

    const total = this.totalItems;

    if (matchesKey(data, Key.up)) {
      this.selectedIndex =
        this.selectedIndex === 0 ? total - 1 : this.selectedIndex - 1;
      return;
    }

    if (matchesKey(data, Key.down)) {
      this.selectedIndex =
        this.selectedIndex === total - 1 ? 0 : this.selectedIndex + 1;
      return;
    }

    if (data === " " || matchesKey(data, Key.enter)) {
      if (this.selectedIndex === 0) {
        this.state.generateAgents = !this.state.generateAgents;
      } else {
        const dirItem = this.state.agentsDirItems[this.selectedIndex - 1];
        if (dirItem) {
          dirItem.checked = !dirItem.checked;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Lock computation
// ---------------------------------------------------------------------------

function recomputeSkillLocks(state: WizardState): void {
  // Reset all locks
  for (const item of state.skillItems) {
    item.locked = false;
    item.lockedBy = undefined;
  }

  // Find checked packages and lock their bundled skills
  for (const pkgItem of state.packageItems) {
    if (!pkgItem.checked) continue;

    const entry = state.catalog.find(
      (e) => e.type === "package" && e.name === pkgItem.label,
    );
    if (!entry || entry.type !== "package" || entry.skillPaths.length === 0) {
      continue;
    }

    for (const skillItem of state.skillItems) {
      const skillEntry = state.catalog.find(
        (e) => e.type === "skill" && e.name === skillItem.label,
      );
      if (skillEntry && entry.skillPaths.includes(skillEntry.path)) {
        skillItem.locked = true;
        skillItem.lockedBy = pkgItem.label;
        skillItem.checked = true;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Build items from catalog
// ---------------------------------------------------------------------------

function buildPackageItems(
  catalog: CatalogEntry[],
  installedPackages: Set<string>,
): FuzzyMultiSelectorItem[] {
  return catalog
    .filter(
      (e): e is CatalogEntry & { type: "package" } => e.type === "package",
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const skillCount = entry.skillPaths.length;
      const suffix =
        skillCount > 0
          ? `(${skillCount} skill${skillCount !== 1 ? "s" : ""})`
          : undefined;
      return {
        label: entry.name,
        description: entry.description || undefined,
        suffix,
        checked: installedPackages.has(entry.path),
      };
    });
}

function buildSkillItems(
  catalog: CatalogEntry[],
  installedSkills: Set<string>,
): FuzzyMultiSelectorItem[] {
  return catalog
    .filter((e) => e.type === "skill")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      label: entry.name,
      description: entry.description,
      checked: installedSkills.has(entry.path),
    }));
}

function buildAgentsDirItems(
  cwd: string,
  childProjects: string[],
): Array<{ path: string; checked: boolean }> {
  const items = [{ path: cwd, checked: true }];
  for (const p of childProjects) {
    // Show relative-ish label: just the last segments after cwd
    const relative = p.startsWith(cwd) ? `./${p.slice(cwd.length + 1)}` : p;
    items.push({ path: relative, checked: true });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Collect result from state
// ---------------------------------------------------------------------------

function collectResult(state: WizardState): WizardResult {
  const selectedEntries: CatalogEntry[] = [];
  const unselectedEntries: CatalogEntry[] = [];

  for (const item of state.packageItems) {
    const entry = state.catalog.find(
      (e) => e.type === "package" && e.name === item.label,
    );
    if (!entry) continue;
    if (item.checked) {
      selectedEntries.push(entry);
    } else {
      unselectedEntries.push(entry);
    }
  }

  for (const item of state.skillItems) {
    const entry = state.catalog.find(
      (e) => e.type === "skill" && e.name === item.label,
    );
    if (!entry) continue;
    if (item.checked) {
      selectedEntries.push(entry);
    } else {
      unselectedEntries.push(entry);
    }
  }

  const agentsDirs = state.agentsDirItems
    .filter((d) => d.checked)
    .map((d) => d.path);

  return {
    selectedEntries,
    unselectedEntries,
    generateAgents: state.generateAgents,
    agentsDirs,
    stack: state.stack,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function showWizard(
  ctx: ExtensionCommandContext,
  catalogDirs: string[],
  catalogDepth: number,
  childProjectDepth: number,
): Promise<WizardResult | null> {
  // --- Loading phase (blocking, before wizard appears) ---
  const catalog = await scanCatalog(catalogDirs, catalogDepth);
  if (catalog.length === 0) {
    ctx.ui.notify(
      "No skills or packages found in catalog directories.",
      "warning",
    );
    return null;
  }

  const stack = await scanProject(ctx.cwd);
  const settings = await readSettings(ctx.cwd);
  const installed = getInstalled(settings);
  const childProjects = findChildProjects(ctx.cwd, childProjectDepth);

  // --- Build shared state ---
  const state: WizardState = {
    catalog,
    stack,
    installedSkills: installed.skills,
    installedPackages: installed.packages,
    packageItems: buildPackageItems(catalog, installed.packages),
    skillItems: buildSkillItems(catalog, installed.skills),
    generateAgents: true,
    agentsDirItems: buildAgentsDirItems(ctx.cwd, childProjects),
  };

  // Apply initial locks
  recomputeSkillLocks(state);

  // --- Show wizard ---
  const settingsTheme = getSettingsListTheme();

  return ctx.ui.custom<WizardResult | null>((_tui, uiTheme, _kb, done) => {
    return new Wizard({
      title: `Project Init — ${stack.summary}`,
      theme: uiTheme,
      hintSuffix: `${catalog.length} items in catalog`,
      minContentHeight: 24,
      onComplete: () => done(collectResult(state)),
      onCancel: () => done(null),
      steps: [
        {
          label: "Packages",
          build: (wizardCtx) =>
            new PackagesStep(state, settingsTheme, wizardCtx),
        },
        {
          label: "Skills",
          build: (wizardCtx) => new SkillsStep(state, settingsTheme, wizardCtx),
        },
        {
          label: "AGENTS.md",
          build: (wizardCtx) => new AgentsStep(state, settingsTheme, wizardCtx),
        },
      ],
    });
  });
}
