/**
 * In-memory LIFO stack for editor text stashing.
 * Ephemeral: resets on restart.
 */

const stack: string[] = [];

export function stashPush(text: string): void {
  stack.push(text);
}

export function stashPop(): string | undefined {
  return stack.pop();
}

export function stashCount(): number {
  return stack.length;
}
