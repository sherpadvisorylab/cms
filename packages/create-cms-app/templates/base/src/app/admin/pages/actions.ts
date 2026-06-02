"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ComponentInstance, CmsPageSeo } from "@sherpacms/domain";

type PageVersionRecord = {
  id: string;
  pageId: string;
  version: number;
  structure: unknown;
  publishedAt: Date | string | null;
  createdAt: Date | string;
};

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

// ── Create ────────────────────────────────────────────────────────────────────
export async function createPage(formData: FormData) {
  const structureRaw = formData.get("structure") as string | null;
  const structure    = structureRaw ? JSON.parse(structureRaw) : [];

  const page = await cms.pages.create({
    area:   formData.get("area") as string,
    slug:   formData.get("slug") as string,
    title:  formData.get("title") as string,
    status: "draft",
    structure,
    seo: {
      metaTitle:       (formData.get("seoTitle") as string)       || undefined,
      metaDescription: (formData.get("seoDescription") as string) || undefined,
    },
  });
  await cms.pageVersions.createVersion(page.id, { structure, publish: false });
  redirect(`/admin/pages/${page.id}`);
}

// —— Clone page (copies metadata + latest version structure/content into a new draft page) ——
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

  const duplicate = allPages.find(
    (page) =>
      page.id !== data.sourcePageId
      && page.area === data.area
      && page.slug === data.slug
  );
  if (duplicate) {
    throw new Error("A page with this permalink already exists in the selected area");
  }

  const clonedPage = await cms.pages.create({
    area: data.area,
    slug: data.slug,
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

// ── Update settings ───────────────────────────────────────────────────────────
export async function updatePage(id: string, formData: FormData) {
  const parentId = formData.get("parentId") as string;
  const slug     = formData.get("slug") as string;
  const status   = (formData.get("status") as "draft" | "published" | "archived") || "draft";
  await cms.pages.update(id, {
    title:    formData.get("title") as string,
    slug,
    area:     formData.get("area") as string,
    status,
    parentId: parentId || null,
    seo: {
      metaTitle:       (formData.get("seoTitle") as string)       || undefined,
      metaDescription: (formData.get("seoDescription") as string) || undefined,
      keywords:        (formData.get("keywords") as string)       || undefined,
    },
    ogImageUrl: (formData.get("ogImageUrl") as string) || undefined,
  });
  // When publishing via settings form, also stamp the latest version as published
  if (status === "published") {
    const latest = await cms.pageVersions.getLatest(id);
    if (latest) {
      await markVersionAsPublished(id, latest.id);
    }
  }
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${id}`);
  await cms.revalidatePage(slug);
}

// ── Quick update from list drawer ─────────────────────────────────────────────
export async function quickUpdatePage(id: string, data: {
  title: string; slug: string; area: string; parentId?: string | null; status: string;
}) {
  await cms.pages.update(id, {
    title:    data.title,
    slug:     data.slug,
    area:     data.area,
    parentId: data.parentId || null,
    status:   data.status as "draft" | "published" | "archived",
  });
  // When publishing, also stamp the latest version as published so renderContent can find it
  if (data.status === "published") {
    const latest = await cms.pageVersions.getLatest(id);
    if (latest) {
      await markVersionAsPublished(id, latest.id);
    }
  }
  revalidatePath("/admin/pages");
  revalidatePath(`/${data.slug}`);
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deletePage(id: string) {
  // Guard: system pages are not deletable
  const page = (await cms.pages.findAll()).find((p) => p.id === id);
  if (page) {
    const area = await cms.areas.findByKey(page.area).catch(() => null);
    const isSystem = area?.systemPages && Object.values(area.systemPages).includes(id);
    if (isSystem) throw new Error("System pages cannot be deleted. Unassign the system page role first.");
  }
  await cms.pages.delete(id);
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

// ── Update structure (creates a new draft version) ────────────────────────────
export async function updateStructure(pageId: string, structureJson: string) {
  const structure = JSON.parse(structureJson) as ComponentInstance[];
  const version = await cms.pageVersions.createVersion(pageId, { structure, publish: false });
  revalidatePath(`/admin/pages/${pageId}/content`);
  revalidatePath(`/admin/pages/${pageId}/structure`);
  return { versionId: version.id, versionNumber: version.version };
}

// ── Publish (creates a published version snapshot + sets status) ──────────────
export async function publishPage(pageId: string) {
  const [latest, allPages] = await Promise.all([
    cms.pageVersions.getLatest(pageId),
    cms.pages.findAll(),
  ]);
  if (!latest) throw new Error("No version to publish");
  const version = await markVersionAsPublished(pageId, latest.id);
  await cms.pages.update(pageId, { status: "published" });
  const slug = allPages.find((p) => p.id === pageId)?.slug ?? "";
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
  await cms.revalidatePage(slug);
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
  const slug = allPages.find((p) => p.id === pageId)?.slug ?? "";
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
  await cms.revalidatePage(slug);
  return { versionId: version.id, versionNumber: version.version };
}

// ── Save page-level schema config (stored in seo.schemaConfig) ───────────────
export async function savePageSchemaConfig(pageId: string, config: {
  enabledIndices: number[];
  manualEnabled:  boolean;
  manualTemplate: string;
}) {
  const pages = await cms.pages.findAll();
  const page  = pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Page not found");
  await cms.pages.update(pageId, {
    seo: { ...(page.seo ?? {}), schemaConfig: config } as CmsPageSeo,
  });
  revalidatePath(`/admin/pages/${pageId}`);
}

// ── System page assignment ────────────────────────────────────────────────────
export async function assignSystemPage(areaName: string, type: string, pageId: string) {
  await cms.assignSystemPage(areaName, type, pageId);
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
  // Revalidate the appropriate public route
  if (type === "home") revalidatePath("/");
  revalidatePath(`/${type}`);
}

export async function removeSystemPage(areaName: string, type: string) {
  await cms.removeSystemPage(areaName, type);
  revalidatePath("/admin/pages");
  if (type === "home") revalidatePath("/");
  revalidatePath(`/${type}`);
}

// ── Unpublish (sets status back to draft, keeps version history intact) ───────
export async function unpublishPage(pageId: string) {
  const allPages = await cms.pages.findAll();
  const slug = allPages.find((p) => p.id === pageId)?.slug ?? "";
  await cms.pages.update(pageId, { status: "draft" });
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
  await cms.revalidatePage(slug);
}
