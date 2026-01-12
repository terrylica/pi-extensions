/**
 * GitHub API tool for fetching repository content, issues, and pull requests.
 */

import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { createGitHubClient, parseGitHubUrl } from "../../../lib/clients";

const parameters = Type.Object({
  url: Type.String({
    description:
      "GitHub URL to fetch. Supports repositories, files, directories, issues, and pull requests.",
  }),
});

export const githubTool: ToolDefinition<typeof parameters> = {
  name: "github",
  label: "GitHub",
  description: `Fetch content from GitHub via the API. Better for code and GitHub-specific content than generic URL fetching.

Supports:
- Repository: https://github.com/owner/repo
- File: https://github.com/owner/repo/blob/main/path/to/file.ts
- Directory: https://github.com/owner/repo/tree/main/path/to/dir
- Issue: https://github.com/owner/repo/issues/123
- Pull Request: https://github.com/owner/repo/pull/456

Requires: GITHUB_TOKEN environment variable`,

  parameters,

  async execute(
    _toolCallId: string,
    args: { url: string },
    _onUpdate: unknown,
    _ctx: unknown,
    signal?: AbortSignal,
  ) {
    const { url } = args;
    const client = createGitHubClient();
    const parsed = parseGitHubUrl(url);

    let markdown: string;

    switch (parsed.type) {
      case "repo":
      case "tree":
        markdown = await client.fetchRepoInfo(
          parsed.owner,
          parsed.repo,
          signal,
        );
        break;

      case "file":
        if (!parsed.path) {
          throw new Error("File path is required");
        }
        markdown = await client.fetchFileContent(
          parsed.owner,
          parsed.repo,
          parsed.path,
          parsed.ref,
          signal,
        );
        break;

      case "directory":
        if (!parsed.path) {
          throw new Error("Directory path is required");
        }
        markdown = await client.fetchDirectoryContent(
          parsed.owner,
          parsed.repo,
          parsed.path,
          parsed.ref,
          signal,
        );
        break;

      case "issue":
        if (!parsed.number) {
          throw new Error("Issue number is required");
        }
        markdown = await client.fetchIssue(
          parsed.owner,
          parsed.repo,
          parsed.number,
          signal,
        );
        break;

      case "pull":
        if (!parsed.number) {
          throw new Error("PR number is required");
        }
        markdown = await client.fetchPullRequest(
          parsed.owner,
          parsed.repo,
          parsed.number,
          signal,
        );
        break;

      default:
        throw new Error(`Unknown GitHub URL type: ${parsed.type}`);
    }

    return {
      content: [{ type: "text" as const, text: markdown }],
      details: {
        url,
        owner: parsed.owner,
        repo: parsed.repo,
        type: parsed.type,
        number: parsed.number,
      },
    };
  },
};
