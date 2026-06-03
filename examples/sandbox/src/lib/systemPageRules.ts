/**
 * Central source of truth for system page constraints.
 * All rules here apply automatically to every system page type
 * (home, 404, and any future types).
 *
 * Enforcement points:
 *  - actions.ts   : deletePage, unpublishPage, assignSystemPage
 *  - [slug]/route.ts : old slug URL → 404
 *  - PublishToggle   : hide "Unpublish" option
 *  - [id]/page.tsx   : hide slug field, replace Delete with lock notice
 */
export const SYSTEM_PAGE_RULES = {
  /** System pages cannot be deleted while assigned. */
  canDelete:           false,
  /** System pages cannot be moved back to draft once published. */
  canUnpublish:        false,
  /** Page is automatically published when assigned as a system page. */
  autoPublishOnAssign: true,
  /** Slug is system-managed and not user-editable. */
  slugIsLocked:        true,
  /** Old slug URL returns 404 (the page is accessible only via its canonical system URL). */
  oldSlugReturns404:   true,
} as const;

/** Returns the system page type for a given pageId, or null if not a system page. */
export function getSystemPageType(
  systemPages: Record<string, string> | null | undefined,
  pageId: string,
): string | null {
  if (!systemPages) return null;
  return Object.entries(systemPages).find(([, pid]) => pid === pageId)?.[0] ?? null;
}
