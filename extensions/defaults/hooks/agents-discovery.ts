/**
 * Agents Discovery Hook
 *
 * Auto-discovers AGENTS.md files in subdirectories when the agent reads files.
 * Pi's built-in discovery only walks up from cwd. This hook fills the gap by
 * injecting discovered AGENTS.md content into the system prompt.
 *
 * Pattern follows the modes extension:
 * - Discovers AGENTS.md files on read tool results
 * - Injects content into system prompt via before_agent_start hook
 * - Filters agents-discovery messages from LLM context via context hook
 * - Renders custom UI messages for user visibility
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import { Box, Markdown, Text } from "@mariozechner/pi-tui";
import type {
  AgentsDiscoveryManager,
  DiscoveredFile,
} from "../lib/agents-discovery";

const AGENTS_DISCOVERY_MESSAGE_TYPE = "agents-discovery";

export interface AgentsDiscoveryDetails {
  path: string;
  content: string;
}

export function setupAgentsDiscoveryHook(
  pi: ExtensionAPI,
  manager: AgentsDiscoveryManager,
) {
  // Track all discovered AGENTS.md files for system prompt injection
  // These persist across turns once discovered (like breadcrumbs guidance)
  const discoveredFiles: DiscoveredFile[] = [];

  // Register custom message renderer
  pi.registerMessageRenderer<AgentsDiscoveryDetails>(
    AGENTS_DISCOVERY_MESSAGE_TYPE,
    (message, options, theme) => {
      const { details } = message;
      if (!details) return undefined;

      const { expanded } = options;
      const prettyPath = manager.prettyPath(details.path);

      const label = theme.bold(theme.fg("accent", "[AGENTS]"));
      const header = `${label} ${theme.fg("muted", prettyPath)}`;

      const box = new Box(1, 1, (t) => theme.bg("customMessageBg", t));
      box.addChild(new Text(header, 0, 0));

      if (expanded) {
        // Show the markdown content below the header
        box.addChild(new Text("", 0, 0)); // spacer
        const mdTheme = getMarkdownTheme();
        const markdown = new Markdown(details.content, 0, 0, mdTheme);
        box.addChild(markdown);
      }

      return box;
    },
  );

  // Filter agents-discovery messages from LLM context
  pi.on("context", async (event) => {
    const messages = event.messages.filter((message) => {
      const maybeCustom = message as { customType?: unknown };
      return maybeCustom.customType !== AGENTS_DISCOVERY_MESSAGE_TYPE;
    });

    return { messages };
  });

  // Inject discovered AGENTS.md content into system prompt on every turn
  // This persists discovered files across turns (like breadcrumbs guidance)
  pi.on("before_agent_start", async (event) => {
    if (discoveredFiles.length === 0) return;

    // Build injection content from all discovered files
    const injections = discoveredFiles.map(
      (file) =>
        `<agents_md path="${file.path}">\n${file.content}\n</agents_md>`,
    );

    return {
      systemPrompt: `${event.systemPrompt}\n\n## Discovered AGENTS.md files\n\n${injections.join("\n\n")}`,
    };
  });

  const handleSessionChange = (_event: unknown, ctx: ExtensionContext) => {
    manager.resetSession(ctx.cwd);
    discoveredFiles.length = 0;
  };

  pi.on("session_start", handleSessionChange);
  pi.on("session_switch", handleSessionChange);

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "read" || event.isError) return undefined;

    const pathInput = event.input.path as string | undefined;
    if (!pathInput) return undefined;

    if (!manager.isInitialized) manager.resetSession(ctx.cwd);

    let discovered: Awaited<ReturnType<typeof manager.discover>>;
    try {
      discovered = await manager.discover(pathInput);
    } catch (error) {
      if (ctx.hasUI) {
        ctx.ui.notify(
          `Failed to load subdirectory context: ${String(error)}`,
          "warning",
        );
      }
      return undefined;
    }

    if (!discovered) return undefined;

    const prettyPaths = discovered.map((f) => manager.prettyPath(f.path));

    // Add newly discovered files to the persistent collection
    // They will be injected into the system prompt on every subsequent turn
    for (const file of discovered) {
      // Avoid duplicates
      if (!discoveredFiles.some((f) => f.path === file.path)) {
        discoveredFiles.push(file);
      }
    }

    // Send custom messages for UI display (filtered from LLM context)
    for (const file of discovered) {
      pi.sendMessage({
        customType: AGENTS_DISCOVERY_MESSAGE_TYPE,
        content: `Discovered AGENTS.md: ${manager.prettyPath(file.path)}`,
        display: true,
        details: { path: file.path, content: file.content },
      });
    }

    // Notify UI about the discovery
    if (ctx.hasUI) {
      ctx.ui.notify(
        `Loaded subdirectory context: ${prettyPaths.join(", ")}`,
        "info",
      );
    }

    return undefined; // Don't modify the original read result
  });
}
