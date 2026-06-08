"use server";

import { cms } from "@/lib/cms";
import { buildPermalinkMap, normalizePermalink } from "@/lib/pagePermalinks";
import { sanitizePageTemplateStructure } from "@/lib/pageTemplates";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ComponentInstance, CmsPage, CmsPageSeo } from "@sherpacms/domain";
import { SYSTEM_PAGE_RULES, getSystemPageType } from "@/lib/systemPageRules";

type PageVersionRecord = {
  id: string;
  pageId: string;
  version: number;
  structure: unknown;
  publishedAt: Date | string | null;
  createdAt: Date | string;
};

type PageDraftInput = Pick<
  CmsPage,
  "id" | "area" | "slug" | "parentId" | "permalink" | "hasCustomPermalink" | "status"
>;

function getPageVersionAdapter() {
  const adapter = (cms.pageVersions as unknown as {
    adapter?: {
      getAll<T>(collection: string, filter?: Partial<Record<string, unknown>>): Promise<T[]>;
      update<T extends { id: string }>(collection: string, id: string, data: Partial<T>): Promise<T>;
    };
  }).adapter;

  if (!adapter) {
    throw new Error("Page version storage unavailable");
  }

  return adapter;
}

async function markVersionAsPublished(pageId: string, versionId: string) {
  const adapter = getPageVersionAdapter();
  return adapter.update<PageVersionRecord>("pageVersions", versionId, {
    publishedAt: new Date(),
  });
}

function applyPageDraft(pages: CmsPage[], draft: PageDraftInput) {
  const existing = pages.find((page) => page.id === draft.id);
  if (existing) {
    return pages.map((page) => (page.id === draft.id ? { ...page, ...draft } : page));
  }
  return [...pages, draft as CmsPage];
}

function resolveDraftPermalink(pages: CmsPage[], draft: PageDraftInput) {
  const nextPages = applyPageDraft(pages, draft);
  return buildPermalinkMap(nextPages)[draft.id] ?? normalizePermalink(draft.permalink ?? draft.slug);
}

function collectDescendantIds(pages: CmsPage[], pageId: string) {
  const descendants = new Set<string>();
  const queue = [pageId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const page of pages) {
      if (page.parentId === currentId && !descendants.has(page.id)) {
        descendants.add(page.id);
        queue.push(page.id);
      }
    }
  }

  return descendants;
}

async function syncDescendantPermalinks(
  pages: CmsPage[],
  rootPageId: string,
  changedPermalinks: Set<string>,
) {
  const permalinkMap = buildPermalinkMap(pages);
  const descendantIds = collectDescendantIds(pages, rootPageId);

  for (const page of pages) {
    if (!descendantIds.has(page.id) || page.hasCustomPermalink) continue;
    const nextPermalink = permalinkMap[page.id] ?? normalizePermalink(page.permalink ?? page.slug);
    const previousPermalink = normalizePermalink(page.permalink ?? page.slug);
    if (previousPermalink !== nextPermalink) {
      await cms.pages.update(page.id, { permalink: nextPermalink });
      changedPermalinks.add(previousPermalink);
      changedPermalinks.add(nextPermalink);
    }
  }
}

function assertPermalinkAvailable(
  pages: CmsPage[],
  area: string,
  permalink: string,
  excludedPageId?: string,
) {
  const normalizedPermalink = normalizePermalink(permalink);
  const duplicate = pages.find(
    (page) =>
      page.id !== excludedPageId &&
      page.area === area &&
      normalizePermalink(page.permalink ?? page.slug) === normalizedPermalink,
  );

  if (duplicate) {
    throw new Error("A page with this permalink already exists in the selected area");
  }
}

function readCustomPermalinkFlag(formData: FormData) {
  return ["1", "true", "on"].includes(String(formData.get("hasCustomPermalink") ?? ""));
}

function revalidatePublicPermalinks(permalinks: Iterable<string>) {
  const unique = [...new Set([...permalinks].map((value) => normalizePermalink(value)).filter(Boolean))];
  for (const permalink of unique) {
    revalidatePath(permalink);
  }
  return cms.revalidatePage(unique);
}

export async function createPage(formData: FormData) {
  const structureRaw = formData.get("structure") as string | null;
  const structure = sanitizePageTemplateStructure(
    structureRaw ? JSON.parse(structureRaw) : [],
  );
  const allPages = await cms.pages.findAll();

  const area = String(formData.get("area") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const hasCustomPermalink = readCustomPermalinkFlag(formData);
  const requestedPermalink = (formData.get("permalink") as string) || null;

  if (!area || !title || !slug || !seoTitle) {
    throw new Error("Area, title, slug, and meta title are required");
  }

  const draftPage: PageDraftInput = {
    id: `draft-${Date.now()}`,
    area,
    slug,
    parentId,
    permalink: hasCustomPermalink ? requestedPermalink : null,
    hasCustomPermalink,
    status: "draft",
  };
  const permalink = resolveDraftPermalink(allPages, draftPage);
  assertPermalinkAvailable(allPages, area, permalink);

  const page = await cms.pages.create({
    area,
    slug,
    permalink,
    hasCustomPermalink,
    title,
    parentId,
    status: "draft",
    structure,
    seo: {
      metaTitle: seoTitle || undefined,
      metaDescription: (formData.get("seoDescription") as string) || undefined,
      keywords: (formData.get("keywords") as string) || undefined,
    },
    ogImageUrl: (formData.get("ogImageUrl") as string) || undefined,
  });
  await cms.pageVersions.createVersion(page.id, { structure, publish: false });
  redirect(`/admin/pages/${page.id}/content`);
}

export async function clonePage(data: {
  sourcePageId: string;
  title: string;
  slug: string;
  area: string;
  parentId?: string | null;
}) {
  const [allPages, latestVersion] = await Promise.all([
    cms.pages.findAll(),
    cms.pageVersions.getLatest(data.sourcePageId),
  ]);

  const sourcePage = allPages.find((page) => page.id === data.sourcePageId);
  if (!sourcePage) {
    throw new Error("Source page not found");
  }

  const draftPage: PageDraftInput = {
    id: `draft-${Date.now()}`,
    area: data.area,
    slug: data.slug,
    parentId: data.parentId || null,
    permalink: null,
    hasCustomPermalink: false,
    status: "draft",
  };
  const permalink = resolveDraftPermalink(allPages, draftPage);
  assertPermalinkAvailable(allPages, data.area, permalink, data.sourcePageId);

  const clonedPage = await cms.pages.create({
    area: data.area,
    slug: data.slug,
    permalink,
    hasCustomPermalink: false,
    title: data.title,
    parentId: data.parentId || null,
    status: "draft",
    structure: sourcePage.structure ?? [],
    content: sourcePage.content ?? {},
    seo: sourcePage.seo ?? {},
    style: sourcePage.style ?? {},
    seoTitle: sourcePage.seoTitle ?? undefined,
    seoDescription: sourcePage.seoDescription ?? undefined,
    ogImageUrl: sourcePage.ogImageUrl ?? undefined,
  });

  await cms.pageVersions.createVersion(clonedPage.id, {
    structure: latestVersion?.structure ?? sourcePage.structure ?? [],
    content: latestVersion?.content ?? sourcePage.content ?? {},
    publish: false,
  });

  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${clonedPage.id}`);
  return { pageId: clonedPage.id };
}

export async function updatePage(id: string, formData: FormData) {
  const allPages = await cms.pages.findAll();
  const currentPage = allPages.find((page) => page.id === id);
  if (!currentPage) {
    throw new Error("Page not found");
  }

  const parentId = (formData.get("parentId") as string) || null;
  const slug = formData.get("slug") as string;
  const status = (formData.get("status") as "draft" | "published" | "archived") || "draft";
  const hasCustomPermalink = readCustomPermalinkFlag(formData);
  const requestedPermalink = (formData.get("permalink") as string) || null;

  const draftPage: PageDraftInput = {
    id,
    area: formData.get("area") as string,
    slug,
    parentId,
    permalink: hasCustomPermalink ? requestedPermalink : null,
    hasCustomPermalink,
    status,
  };
  const permalink = resolveDraftPermalink(allPages, draftPage);
  assertPermalinkAvailable(allPages, draftPage.area, permalink, id);

  const changedPermalinks = new Set<string>([
    normalizePermalink(currentPage.permalink ?? currentPage.slug),
    permalink,
  ]);

  await cms.pages.update(id, {
    title: formData.get("title") as string,
    slug,
    permalink,
    hasCustomPermalink,
    area: draftPage.area,
    status,
    parentId,
    seo: {
      metaTitle: (formData.get("seoTitle") as string) || undefined,
      metaDescription: (formData.get("seoDescription") as string) || undefined,
      keywords: (formData.get("keywords") as string) || undefined,
    },
    ogImageUrl: (formData.get("ogImageUrl") as string) || undefined,
  });

  const nextPages = applyPageDraft(allPages, {
    ...currentPage,
    ...draftPage,
    permalink,
  });
  await syncDescendantPermalinks(nextPages, id, changedPermalinks);

  if (status === "published") {
    const latest = await cms.pageVersions.getLatest(id);
    if (latest) {
      await markVersionAsPublished(id, latest.id);
    }
  }

  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${id}`);
  await revalidatePublicPermalinks(changedPermalinks);
}

export async function quickUpdatePage(
  id: string,
  data: {
    title: string;
    slug: string;
    area: string;
    parentId?: string | null;
    status: string;
  },
) {
  const allPages = await cms.pages.findAll();
  const currentPage = allPages.find((page) => page.id === id);
  if (!currentPage) {
    throw new Error("Page not found");
  }

  const draftPage: PageDraftInput = {
    id,
    area: data.area,
    slug: data.slug,
    parentId: data.parentId || null,
    permalink: currentPage.hasCustomPermalink ? currentPage.permalink : null,
    hasCustomPermalink: currentPage.hasCustomPermalink ?? false,
    status: data.status as "draft" | "published" | "archived",
  };
  const permalink = resolveDraftPermalink(allPages, draftPage);
  assertPermalinkAvailable(allPages, data.area, permalink, id);

  const changedPermalinks = new Set<string>([
    normalizePermalink(currentPage.permalink ?? currentPage.slug),
    permalink,
  ]);

  await cms.pages.update(id, {
    title: data.title,
    slug: data.slug,
    permalink,
    hasCustomPermalink: currentPage.hasCustomPermalink ?? false,
    area: data.area,
    parentId: data.parentId || null,
    status: data.status as "draft" | "published" | "archived",
  });

  const nextPages = applyPageDraft(allPages, {
    ...currentPage,
    ...draftPage,
    permalink,
  });
  await syncDescendantPermalinks(nextPages, id, changedPermalinks);

  if (data.status === "published") {
    const latest = await cms.pageVersions.getLatest(id);
    if (latest) {
      await markVersionAsPublished(id, latest.id);
    }
  }

  revalidatePath("/admin/pages");
  await revalidatePublicPermalinks(changedPermalinks);
}

export async function deletePage(id: string) {
  if (!SYSTEM_PAGE_RULES.canDelete) {
    const page = (await cms.pages.findAll()).find((entry) => entry.id === id);
    if (page) {
      const area = await cms.areas.findByKey(page.area).catch(() => null);
      if (getSystemPageType(area?.systemPages, id)) {
        throw new Error("System pages cannot be deleted. Unassign the system page role first.");
      }
    }
  }
  await cms.pages.delete(id);
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

export async function updateStructure(pageId: string, structureJson: string) {
  const structure = JSON.parse(structureJson) as ComponentInstance[];
  const version = await cms.pageVersions.createVersion(pageId, { structure, publish: false });
  revalidatePath(`/admin/pages/${pageId}/content`);
  revalidatePath(`/admin/pages/${pageId}/structure`);
  return { versionId: version.id, versionNumber: version.version };
}

export async function publishPage(pageId: string) {
  const [latest, allPages] = await Promise.all([
    cms.pageVersions.getLatest(pageId),
    cms.pages.findAll(),
  ]);
  if (!latest) throw new Error("No version to publish");
  const version = await markVersionAsPublished(pageId, latest.id);
  await cms.pages.update(pageId, { status: "published" });
  const permalink =
    normalizePermalink(allPages.find((page) => page.id === pageId)?.permalink ?? "");
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
  await revalidatePublicPermalinks([permalink]);
  return { versionId: version.id, versionNumber: version.version };
}

export async function publishVersion(pageId: string, versionId: string) {
  const adapter = getPageVersionAdapter();
  const [versions, allPages] = await Promise.all([
    adapter.getAll<PageVersionRecord>("pageVersions", { pageId }),
    cms.pages.findAll(),
  ]);
  const sourceVersion = versions.find((version) => version.id === versionId) ?? null;

  if (!sourceVersion) throw new Error("Version not found");

  const version = await markVersionAsPublished(pageId, sourceVersion.id);
  await cms.pages.update(pageId, { status: "published" });
  const permalink =
    normalizePermalink(allPages.find((page) => page.id === pageId)?.permalink ?? "");
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
  await revalidatePublicPermalinks([permalink]);
  return { versionId: version.id, versionNumber: version.version };
}

export async function savePageSchemaConfig(
  pageId: string,
  config: {
    enabledIndices: number[];
    manualEnabled: boolean;
    manualTemplate: string;
  },
) {
  const pages = await cms.pages.findAll();
  const page = pages.find((entry) => entry.id === pageId);
  if (!page) throw new Error("Page not found");
  await cms.pages.update(pageId, {
    seo: { ...(page.seo ?? {}), schemaConfig: config } as CmsPageSeo,
  });
  revalidatePath(`/admin/pages/${pageId}`);
}

export async function assignSystemPage(areaName: string, type: string, pageId: string) {
  await cms.assignSystemPage(areaName, type, pageId);

  if (SYSTEM_PAGE_RULES.autoPublishOnAssign) {
    const page = (await cms.pages.findAll()).find((entry) => entry.id === pageId);
    if (page && page.status !== "published") {
      const latest = await cms.pageVersions.getLatest(pageId).catch(() => null);
      if (latest) await markVersionAsPublished(pageId, latest.id);
      await cms.pages.update(pageId, { status: "published" });
    }
  }

  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
  if (type === "home") revalidatePath("/");
  revalidatePath(`/${type}`);
}

export async function removeSystemPage(areaName: string, type: string) {
  await cms.removeSystemPage(areaName, type);
  revalidatePath("/admin/pages");
  if (type === "home") revalidatePath("/");
  revalidatePath(`/${type}`);
}

// ─── Component copy / move actions ──────────────────────────────────────────

export async function fetchPagesForModal() {
  const pages = await cms.pages.findAll();
  return pages.map((p) => ({
    id: p.id,
    title: p.title,
    permalink: p.permalink ?? p.slug ?? "",
    area: p.area,
    status: p.status,
  }));
}

export async function fetchPageStructureForModal(pageId: string) {
  const [latest, allComponents] = await Promise.all([
    cms.pageVersions.getLatest(pageId),
    cms.components.findAll(),
  ]);
  const structure = (latest?.structure ?? []) as ComponentInstance[];
  const componentNames: Record<string, { name: string; namespace: string | null }> = {};
  for (const c of allComponents) {
    componentNames[c.id] = { name: c.name, namespace: c.namespace ?? null };
  }
  return { structure, componentNames };
}

export async function copyComponentToPage(
  sourcePageId: string,
  componentJson: string,
  targetPageId: string,
  targetIdx: number | null,
  position: "above" | "below" | "start",
) {
  const component = JSON.parse(componentJson) as ComponentInstance;
  const [latest, allPages] = await Promise.all([
    cms.pageVersions.getLatest(targetPageId),
    cms.pages.findAll(),
  ]);
  const targetPage = allPages.find((p) => p.id === targetPageId);
  const targetStructure = [...((latest?.structure ?? targetPage?.structure ?? []) as ComponentInstance[])];
  const insertAt =
    position === "start" ? 0
    : position === "above" ? (targetIdx ?? 0)
    : (targetIdx ?? 0) + 1;
  targetStructure.splice(Math.max(0, Math.min(insertAt, targetStructure.length)), 0, { ...component });
  await cms.pageVersions.createVersion(targetPageId, { structure: targetStructure, publish: false });
  revalidatePath(`/admin/pages/${targetPageId}/content`);
  revalidatePath(`/admin/pages/${sourcePageId}/content`);
}

export async function moveComponentToPage(
  sourcePageId: string,
  sourceIdx: number,
  componentJson: string,
  targetPageId: string,
  targetIdx: number | null,
  position: "above" | "below" | "start",
) {
  const component = JSON.parse(componentJson) as ComponentInstance;

  if (sourcePageId === targetPageId) {
    const latest = await cms.pageVersions.getLatest(sourcePageId);
    const allPages = await cms.pages.findAll();
    const sourcePage = allPages.find((p) => p.id === sourcePageId);
    const structure = [...((latest?.structure ?? sourcePage?.structure ?? []) as ComponentInstance[])];
    structure.splice(sourceIdx, 1);
    const rawInsertAt =
      position === "start" ? 0
      : position === "above" ? (targetIdx ?? 0)
      : (targetIdx ?? 0) + 1;
    const insertAt = rawInsertAt > sourceIdx ? rawInsertAt - 1 : rawInsertAt;
    structure.splice(Math.max(0, Math.min(insertAt, structure.length)), 0, { ...component });
    await cms.pageVersions.createVersion(sourcePageId, { structure, publish: false });
    revalidatePath(`/admin/pages/${sourcePageId}/content`);
    return;
  }

  const [sourceLatest, targetLatest, allPages] = await Promise.all([
    cms.pageVersions.getLatest(sourcePageId),
    cms.pageVersions.getLatest(targetPageId),
    cms.pages.findAll(),
  ]);
  const sourcePage = allPages.find((p) => p.id === sourcePageId);
  const targetPage = allPages.find((p) => p.id === targetPageId);
  const sourceStructure = [...((sourceLatest?.structure ?? sourcePage?.structure ?? []) as ComponentInstance[])];
  const targetStructure = [...((targetLatest?.structure ?? targetPage?.structure ?? []) as ComponentInstance[])];

  sourceStructure.splice(sourceIdx, 1);

  const insertAt =
    position === "start" ? 0
    : position === "above" ? (targetIdx ?? 0)
    : (targetIdx ?? 0) + 1;
  targetStructure.splice(Math.max(0, Math.min(insertAt, targetStructure.length)), 0, { ...component });

  await Promise.all([
    cms.pageVersions.createVersion(sourcePageId, { structure: sourceStructure, publish: false }),
    cms.pageVersions.createVersion(targetPageId, { structure: targetStructure, publish: false }),
  ]);
  revalidatePath(`/admin/pages/${sourcePageId}/content`);
  revalidatePath(`/admin/pages/${targetPageId}/content`);
}

export async function linkComponentToPage(
  sourcePageId: string,
  sourceIdx: number,
  targetPageId: string,
  targetIdx: number | null,
  position: "above" | "below" | "start",
) {
  const [sourceLatest, targetLatest, allPages] = await Promise.all([
    cms.pageVersions.getLatest(sourcePageId),
    cms.pageVersions.getLatest(targetPageId),
    cms.pages.findAll(),
  ]);

  const sourcePage = allPages.find((p) => p.id === sourcePageId);
  const targetPage = allPages.find((p) => p.id === targetPageId);
  const sourceStructure = [...((sourceLatest?.structure ?? sourcePage?.structure ?? []) as ComponentInstance[])];
  const targetStructure = [...((targetLatest?.structure ?? targetPage?.structure ?? []) as ComponentInstance[])];

  const originInstance = sourceStructure[sourceIdx];
  if (!originInstance) throw new Error("Source component not found");
  if (originInstance.linkedFrom) throw new Error("Linked components cannot be linked again");

  // Ensure origin has a stable instanceId
  if (!originInstance.instanceId) {
    originInstance.instanceId = crypto.randomUUID();
    sourceStructure[sourceIdx] = originInstance;
    await cms.pageVersions.createVersion(sourcePageId, { structure: sourceStructure, publish: false });
  }

  const linkedInstance: ComponentInstance = {
    componentId: originInstance.componentId,
    props: {},
    linkedFrom: { pageId: sourcePageId, instanceId: originInstance.instanceId },
  };

  const insertAt =
    position === "start" ? 0
    : position === "above" ? (targetIdx ?? 0)
    : (targetIdx ?? 0) + 1;
  targetStructure.splice(Math.max(0, Math.min(insertAt, targetStructure.length)), 0, linkedInstance);

  await cms.pageVersions.createVersion(targetPageId, { structure: targetStructure, publish: false });
  revalidatePath(`/admin/pages/${sourcePageId}/content`);
  revalidatePath(`/admin/pages/${targetPageId}/content`);
}

export async function unlinkComponent(pageId: string, instanceIdx: number) {
  const [latest, allPages] = await Promise.all([
    cms.pageVersions.getLatest(pageId),
    cms.pages.findAll(),
  ]);
  const page = allPages.find((p) => p.id === pageId);
  const structure = [...((latest?.structure ?? page?.structure ?? []) as ComponentInstance[])];

  const instance = structure[instanceIdx];
  if (!instance) throw new Error("Component not found");
  if (!instance.linkedFrom) throw new Error("Component is not linked");

  // Resolve current props from origin before unlinking
  const originPage = allPages.find((p) => p.id === instance.linkedFrom!.pageId);
  if (originPage) {
    const originLatest = await cms.pageVersions.getLatest(originPage.id);
    const originInstance = originLatest?.structure.find(
      (s) => s.instanceId === instance.linkedFrom!.instanceId,
    );
    if (originInstance) {
      structure[instanceIdx] = {
        componentId: instance.componentId,
        props: { ...originInstance.props },
        globals: originInstance.globals ? { ...originInstance.globals } : undefined,
        animation: instance.animation,
      };
    } else {
      structure[instanceIdx] = { componentId: instance.componentId, props: {} };
    }
  } else {
    structure[instanceIdx] = { componentId: instance.componentId, props: {} };
  }

  await cms.pageVersions.createVersion(pageId, { structure, publish: false });
  revalidatePath(`/admin/pages/${pageId}/content`);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function unpublishPage(pageId: string) {
  if (!SYSTEM_PAGE_RULES.canUnpublish) {
    const page = (await cms.pages.findAll()).find((entry) => entry.id === pageId);
    if (page) {
      const area = await cms.areas.findByKey(page.area).catch(() => null);
      if (getSystemPageType(area?.systemPages, pageId)) {
        throw new Error("System pages cannot be unpublished.");
      }
    }
  }
  const allPages = await cms.pages.findAll();
  const permalink =
    normalizePermalink(allPages.find((page) => page.id === pageId)?.permalink ?? "");
  await cms.pages.update(pageId, { status: "draft" });
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
  await revalidatePublicPermalinks([permalink]);
}
