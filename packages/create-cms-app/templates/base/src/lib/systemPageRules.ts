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

/**
 * Returns the system page type for a given pageId, or null if not a system page.
 *
 * System page assignment lives on the area's main-language page. A translated
 * sibling (same `translationKey`) inherits the type automatically — pass
 * `translationKey` + `allPages` to resolve that inheritance; omit them to only
 * check for a direct/exact assignment.
 */
export function getSystemPageType(
  systemPages: Record<string, string> | null | undefined,
  pageId: string,
  translationKey?: string | null,
  allPages?: Array<{ id: string; translationKey?: string | null }> | null,
): string | null {
  if (!systemPages) return null;

  const direct = Object.entries(systemPages).find(([, pid]) => pid === pageId)?.[0];
  if (direct) return direct;

  if (!translationKey || !allPages) return null;
  const holderIds = new Set(Object.values(systemPages));
  const mainSibling = allPages.find((p) => holderIds.has(p.id) && p.translationKey === translationKey);
  if (!mainSibling) return null;
  return Object.entries(systemPages).find(([, pid]) => pid === mainSibling.id)?.[0] ?? null;
}
