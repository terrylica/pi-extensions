/**
 * Nix dev shell prompt builder.
 *
 * Generates a prompt that instructs the agent to create shell.nix or flake.nix
 * with a matching .envrc for direnv support.
 */

import type { ProjectStack } from "./scanner";

export function buildNixPrompt(
  choice: "shell.nix" | "flake.nix",
  stack: ProjectStack,
  existing: { hasShell: boolean; hasFlake: boolean },
): string {
  const parts: string[] = [];

  const hasSelected =
    (choice === "shell.nix" && existing.hasShell) ||
    (choice === "flake.nix" && existing.hasFlake);

  const hasOther =
    (choice === "shell.nix" && existing.hasFlake) ||
    (choice === "flake.nix" && existing.hasShell);

  if (hasSelected) {
    parts.push(
      `Please update the existing **${choice}** and matching **.envrc** for this project.`,
    );
  } else if (hasOther) {
    parts.push(
      `Please switch this project to **${choice}** by creating/updating **${choice}** and updating **.envrc** to match.`,
    );
  } else {
    parts.push(
      `Please create a new **${choice}** and a matching **.envrc** for this project.`,
    );
  }
  parts.push("");
  parts.push(`Detected stack: ${stack.summary}`);
  parts.push("");

  parts.push("## Requirements");
  parts.push("");
  parts.push(
    "- Include all tools needed for the detected stack (compilers, package managers, etc.).",
  );
  parts.push("- The .envrc must match the nix mode:");

  if (choice === "shell.nix") {
    parts.push("  - .envrc should contain `use nix`");
    parts.push("");
    parts.push("### shell.nix pattern");
    parts.push("");
    parts.push("```nix");
    parts.push("{");
    parts.push("  pkgs ? import <nixpkgs> { },");
    parts.push("}:");
    parts.push("");
    parts.push("pkgs.mkShell {");
    parts.push("  buildInputs = with pkgs; [");
    parts.push("    # Add packages for the detected stack");
    parts.push("  ];");
    parts.push("}");
    parts.push("```");
  } else {
    parts.push("  - .envrc should contain `use flake`");
    parts.push("");
    parts.push("### flake.nix pattern");
    parts.push("");
    parts.push("```nix");
    parts.push("{");
    parts.push('  description = "dev shell";');
    parts.push("");
    parts.push("  inputs = {");
    parts.push('    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";');
    parts.push('    flake-utils.url = "github:numtide/flake-utils";');
    parts.push("  };");
    parts.push("");
    parts.push("  outputs = { nixpkgs, flake-utils, ... }:");
    parts.push("    flake-utils.lib.eachDefaultSystem (system:");
    parts.push("      let");
    parts.push("        pkgs = import nixpkgs { inherit system; };");
    parts.push("      in {");
    parts.push("        devShells.default = pkgs.mkShell {");
    parts.push("          packages = with pkgs; [");
    parts.push("            # Add packages for the detected stack");
    parts.push("          ];");
    parts.push("        };");
    parts.push("      });");
    parts.push("}");
    parts.push("```");
  }

  parts.push("");
  parts.push("## .envrc extras (add as needed)");
  parts.push("");
  parts.push("- `export DIRENV_WARN_TIMEOUT=0` if builds are slow");
  parts.push(
    "- Layout blocks (`layout node`, `layout bun`) guarded by `if has ...`",
  );
  parts.push("- If this is a monorepo child, consider `source_up`");
  parts.push("");
  parts.push(
    "If the project already has a nix file, update it to include any missing tools. Do not remove existing packages.",
  );

  return parts.join("\n");
}
