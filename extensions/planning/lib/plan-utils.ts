/**
 * Plan utilities - shared helpers for planning commands
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

export const PLANS_DIR = ".agents/plans";

export interface PlanInfo {
  filename: string;
  path: string;
  date: string;
  title: string;
}

/**
 * List all plans in the plans directory
 */
export async function listPlans(cwd: string): Promise<PlanInfo[]> {
  const plansPath = path.join(cwd, PLANS_DIR);

  try {
    const files = await fs.readdir(plansPath);
    const mdFiles = files
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    const plans: PlanInfo[] = [];
    for (const filename of mdFiles) {
      const fullPath = path.join(plansPath, filename);
      const content = await fs.readFile(fullPath, "utf-8");

      // Parse frontmatter for title, fallback to filename
      const titleMatch = content.match(/^---[\s\S]*?title:\s*(.+?)[\r\n]/m);
      const title = titleMatch?.[1]?.trim() || filename.replace(".md", "");

      // Extract date from filename (YYYY-MM-DD-name.md)
      const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch?.[1] || "";

      plans.push({
        filename,
        path: fullPath,
        date,
        title,
      });
    }

    return plans;
  } catch {
    return [];
  }
}

/**
 * Read a plan file
 */
export async function readPlan(planPath: string): Promise<string> {
  return fs.readFile(planPath, "utf-8");
}
