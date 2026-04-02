import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_evt, ctx) => {
    ctx.ui.notify(
      "[the-dumb-zone] This extension has moved to https://github.com/aliou/pi-undercooked",
      "error",
    );
  });
}
