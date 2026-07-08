"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import type { CmsCollection, CmsCollectionRecord, CmsCollectionView, ComponentSchemaField } from "@sherpacms/domain";

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

// ── Relation fields ────────────────────────────────────────────────────────────

/** Records + schema of a collection, for the `relation` field's autocomplete picker. */
export async function getCollectionRecordsForRelationPicker(collectionSlug: string): Promise<{
  records: { id: string; data: Record<string, unknown> }[];
  schema: ComponentSchemaField[];
}> {
  const collection = await cms.collections.findBySlug(collectionSlug).catch(() => null);
  if (!collection) return { records: [], schema: [] };

  const records = await cms.collections.findRecords(collection.id).catch(() => []);
  return {
    records: records.map((r) => ({ id: r.id, data: r.data })),
    schema: collection.schema,
  };
}

// ── CSV import ───────────────────────────────────────────────────────────────

export interface ImportRecordRow {
  /** Existing record id to update, or undefined/unmatched to create a new record. */
  id?: string;
  data: Record<string, unknown>;
}

export interface ImportResult {
  created: number;
  updated: number;
  deleted: number;
  records: CmsCollectionRecord[];
}

/**
 * Bulk-imports parsed CSV rows into a collection. Each row's fields are merged into the
 * existing record's data (not a full replace) so columns absent from the CSV — e.g. `list`
 * fields, which can't round-trip through a flat CSV — are preserved. In "override" mode,
 * any existing record whose id isn't touched by the import is deleted afterward.
 */
export async function importCollectionRecords(
  collectionId: string,
  rows: ImportRecordRow[],
  mode: "merge" | "override",
): Promise<ImportResult> {
  const existing = await cms.collections.findRecords(collectionId);
  const existingById = new Map(existing.map((r) => [r.id, r]));
  const touchedIds = new Set<string>();

  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const existingRecord = row.id ? existingById.get(row.id) : undefined;
    if (existingRecord) {
      await cms.collections.updateRecord(collectionId, existingRecord.id, { ...existingRecord.data, ...row.data });
      touchedIds.add(existingRecord.id);
      updated++;
    } else {
      const record = await cms.collections.createRecord({ collectionId, data: row.data });
      touchedIds.add(record.id);
      created++;
    }
  }

  let deleted = 0;
  if (mode === "override") {
    const toDelete = existing.filter((r) => !touchedIds.has(r.id));
    await Promise.all(toDelete.map((r) => cms.collections.deleteRecord(collectionId, r.id)));
    deleted = toDelete.length;
  }

  const records = await cms.collections.findRecords(collectionId);
  revalidatePath("/admin/collections");
  return { created, updated, deleted, records };
}
