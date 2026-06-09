/**
 * Dev mode — temporarily disables the public page cache for all visitors.
 * State lives in Node.js process memory. Resets on server restart (intentional).
 * In scaled-out environments multiple instances won't share state, which is fine
 * for a temporary developer tool.
 */

let devModeUntil: number | null = null;

export function isDevModeActive(): boolean {
  if (devModeUntil === null) return false;
  if (devModeUntil < Date.now()) {
    devModeUntil = null;
    return false;
  }
  return true;
}

export function getDevModeUntil(): number | null {
  return isDevModeActive() ? devModeUntil : null;
}

export function enableDevMode(durationMinutes: number): number {
  devModeUntil = Date.now() + durationMinutes * 60 * 1000;
  return devModeUntil;
}

export function disableDevMode(): void {
  devModeUntil = null;
}
