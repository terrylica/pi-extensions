declare module "glimpseui" {
  import type { EventEmitter } from "node:events";

  interface GlimpseOpenOptions {
    width?: number;
    height?: number;
    title?: string;
    frameless?: boolean;
    floating?: boolean;
    transparent?: boolean;
    clickThrough?: boolean;
    followCursor?: boolean;
    followMode?: "snap" | "spring";
    cursorAnchor?: string;
    cursorOffset?: { x: number; y: number };
    autoClose?: boolean;
    hidden?: boolean;
    x?: number;
    y?: number;
  }

  interface GlimpseInfo {
    screen: {
      width: number;
      height: number;
      scaleFactor: number;
      visibleWidth: number;
      visibleHeight: number;
    };
    appearance: {
      darkMode: boolean;
      accentColor: string;
      reduceMotion: boolean;
      increaseContrast: boolean;
    };
    cursor: { x: number; y: number };
    screens: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      scaleFactor: number;
    }>;
  }

  interface GlimpseWindow extends EventEmitter {
    send(js: string): void;
    setHTML(html: string): void;
    show(options?: { title?: string }): void;
    close(): void;
    loadFile(path: string): void;
    getInfo(): void;
    followCursor(enabled: boolean, anchor?: string, mode?: string): void;
    info: GlimpseInfo | null;

    on(event: "ready", handler: (info: GlimpseInfo) => void): this;
    on(event: "message", handler: (data: unknown) => void): this;
    on(event: "info", handler: (info: GlimpseInfo) => void): this;
    on(event: "closed", handler: () => void): this;
    on(event: "error", handler: (err: Error) => void): this;
  }

  export function open(
    html: string,
    options?: GlimpseOpenOptions,
  ): GlimpseWindow;

  export function prompt(
    html: string,
    options?: GlimpseOpenOptions & { timeout?: number },
  ): Promise<unknown>;
}
