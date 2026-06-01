"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ComponentInstance } from "@cms/domain";

// ── Create ────────────────────────────────────────────────────────────────────
export async function createPage(formData: FormData) {
  const page = await cms.pages.create({
    area:   formData.get("area") as string,
    slug:   formData.get("slug") as string,
    title:  formData.get("title") as string,
    status: "draft",
    structure: [],
    seo: {
      metaTitle:       (formData.get("seoTitle") as string)       || undefined,
      metaDescription: (formData.get("seoDescription") as string) || undefined,
    },
  });
  await cms.pageVersions.createVersion(page.id, { structure: [], publish: false });
  redirect(`/admin/pages/${page.id}`);
}

// ── Update settings ───────────────────────────────────────────────────────────
export async function updatePage(id: string, formData: FormData) {
  const parentId = formData.get("parentId") as string;
  const status   = (formData.get("status") as "draft" | "published" | "archived") || "draft";
  await cms.pages.update(id, {
    title:    formData.get("title") as string,
    slug:     formData.get("slug") as string,
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
      await cms.pageVersions.createVersion(id, { structure: latest.structure, publish: true });
    }
  }
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${id}`);
}

// ── Quick update from list drawer ─────────────────────────────────────────────
export async function quickUpdatePage(id: string, data: {
  title: string; slug: string; area: string; status: string;
}) {
  await cms.pages.update(id, {
    title:  data.title,
    slug:   data.slug,
    area:   data.area,
    status: data.status as "draft" | "published" | "archived",
  });
  // When publishing, also stamp the latest version as published so renderContent can find it
  if (data.status === "published") {
    const latest = await cms.pageVersions.getLatest(id);
    if (latest) {
      await cms.pageVersions.createVersion(id, {
        structure: latest.structure,
        publish:   true,
      });
    }
  }
  revalidatePath("/admin/pages");
  revalidatePath(`/${data.slug}`);
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deletePage(id: string) {
  await cms.pages.delete(id);
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

// ── Update structure (creates a new draft version) ────────────────────────────
export async function updateStructure(pageId: string, structureJson: string) {
  const structure = JSON.parse(structureJson) as ComponentInstance[];
  await cms.pageVersions.createVersion(pageId, { structure, publish: false });
  revalidatePath(`/admin/pages/${pageId}/content`);
  revalidatePath(`/admin/pages/${pageId}/structure`);
}

// ── Publish (creates a published version snapshot + sets status) ──────────────
export async function publishPage(pageId: string) {
  const latest = await cms.pageVersions.getLatest(pageId);
  if (!latest) throw new Error("No version to publish");
  await cms.pageVersions.createVersion(pageId, {
    structure: latest.structure,
    publish:   true,
  });
  await cms.pages.update(pageId, { status: "published" });
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
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
    seo: { ...(page.seo ?? {}), schemaConfig: config },
  });
  revalidatePath(`/admin/pages/${pageId}`);
}

// ── Unpublish (sets status back to draft, keeps version history intact) ───────
export async function unpublishPage(pageId: string) {
  await cms.pages.update(pageId, { status: "draft" });
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);
}
