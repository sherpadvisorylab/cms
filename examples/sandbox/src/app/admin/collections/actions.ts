"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import type { CmsCollection, CmsCollectionView, ComponentSchemaField } from "@sherpacms/domain";

// ── Collections ───────────────────────────────────────────────────────────────

export async function createCollectionDirect(name: string, slug: string) {
  const collection = await cms.collections.create({
    name,
    slug,
    schema: [],
    views: [],
  });
  revalidatePath("/admin/collections");
  return collection;
}

export async function saveCollectionFull(
  id: string,
  data: {
    name: string;
    slug: string;
    schema: ComponentSchemaField[];
    detailTemplate: string;
    detailCss: string;
    detailJs: string;
    views: CmsCollectionView[];
    slugPattern?: string;
    permalinkPattern?: string;
    detailMetaTitle?: string;
    detailMetaDescription?: string;
    componentDefaultProps?: Record<string, Record<string, unknown>>;
    hasDetailPage?: boolean;
  },
) {
  await cms.collections.update(id, data);
  revalidatePath("/admin/collections");
}

export async function deleteCollection(id: string) {
  await cms.collections.delete(id);
  revalidatePath("/admin/collections");
}

// ── Records ───────────────────────────────────────────────────────────────────

export async function createRecord(collectionId: string, data: Record<string, unknown>) {
  const record = await cms.collections.createRecord({ collectionId, data });
  revalidatePath("/admin/collections");
  return record;
}

export async function updateRecord(
  collectionId: string,
  recordId: string,
  data: Record<string, unknown>,
) {
  const record = await cms.collections.updateRecord(collectionId, recordId, data);
  revalidatePath("/admin/collections");
  return record;
}

export async function deleteRecord(collectionId: string, recordId: string) {
  await cms.collections.deleteRecord(collectionId, recordId);
  revalidatePath("/admin/collections");
}
