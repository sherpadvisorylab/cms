/**
 * Get an item from localStorage and parse as JSON.
 * Returns null if item doesn't exist or parsing fails.
 */
export function getFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  const item = localStorage.getItem(key);
  if (!item) return null;

  try {
    return JSON.parse(item);
  } catch {
    return null;
  }
}

/**
 * Store an item in localStorage as JSON.
 */
export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value, null, 2));
}

/**
 * Generate a unique ID for entities.
 * Format: timestamp-random
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
