import type { CmsCollection, CmsCollectionRecord, ICollectionRepository } from "@sherpacms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class CollectionRepository implements ICollectionRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  // ── Collections ──────────────────────────────────────────────────────────

  async findAll(): Promise<CmsCollection[]> {
    const collections = await this.adapter.getAll<CmsCollection>("collections");
    return collections.sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: string): Promise<CmsCollection | null> {
    return this.adapter.getById<CmsCollection>("collections", id);
  }

  async findBySlug(slug: string): Promise<CmsCollection | null> {
    const all = await this.adapter.getAll<CmsCollection>("collections");
    return all.find((c) => c.slug === slug) ?? null;
  }

  async create(data: Omit<CmsCollection, "id" | "createdAt" | "updatedAt">): Promise<CmsCollection> {
    const now = new Date();
    const collection: CmsCollection = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    return this.adapter.create<CmsCollection>("collections", collection);
  }

  async update(
    id: string,
    data: Partial<Omit<CmsCollection, "id" | "createdAt" | "updatedAt">>,
  ): Promise<CmsCollection> {
    return this.adapter.update<CmsCollection>("collections", id, { ...data, updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    await this.adapter.delete("collections", id);
    // Also remove all records belonging to this collection
    const records = await this.findRecords(id);
    await Promise.all(records.map((r) => this.adapter.delete("collection_records", r.id)));
  }

  // ── Records ───────────────────────────────────────────────────────────────

  async findRecords(collectionId: string): Promise<CmsCollectionRecord[]> {
    const records = await this.adapter.getAll<CmsCollectionRecord>("collection_records", { collectionId });
    return records.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async findRecordById(collectionId: string, recordId: string): Promise<CmsCollectionRecord | null> {
    const record = await this.adapter.getById<CmsCollectionRecord>("collection_records", recordId);
    if (!record || record.collectionId !== collectionId) return null;
    return record;
  }

  async createRecord(
    data: Omit<CmsCollectionRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<CmsCollectionRecord> {
    const now = new Date();
    const record: CmsCollectionRecord = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    return this.adapter.create<CmsCollectionRecord>("collection_records", record);
  }

  async updateRecord(
    collectionId: string,
    recordId: string,
    data: Record<string, unknown>,
  ): Promise<CmsCollectionRecord> {
    return this.adapter.update<CmsCollectionRecord>("collection_records", recordId, {
      data,
      updatedAt: new Date(),
    });
  }

  async deleteRecord(collectionId: string, recordId: string): Promise<void> {
    return this.adapter.delete("collection_records", recordId);
  }
}
