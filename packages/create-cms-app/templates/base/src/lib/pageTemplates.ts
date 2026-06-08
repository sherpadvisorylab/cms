import type { ComponentInstance } from "@sherpacms/domain";

export function sanitizePageTemplateStructure(structure: unknown): ComponentInstance[] {
  if (!Array.isArray(structure)) return [];

  return structure.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];

    const componentId =
      "componentId" in entry && typeof entry.componentId === "string"
        ? entry.componentId.trim()
        : "";

    if (!componentId) return [];

    return [{ componentId, props: {} satisfies Record<string, unknown> }];
  });
}

export function sortByRecentTimestamp<T extends { createdAt?: unknown; updatedAt?: unknown }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => getTimestamp(right) - getTimestamp(left));
}

function getTimestamp(value: { createdAt?: unknown; updatedAt?: unknown }): number {
  return toTimestamp(value.updatedAt) || toTimestamp(value.createdAt) || 0;
}

function toTimestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }
  return 0;
}
