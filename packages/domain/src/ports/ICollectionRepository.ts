import type { CmsCollection, CmsCollectionRecord } from "../entities/Collection";

export interface ICollectionRepository {
  // Collections
  findAll(): Promise<CmsCollection[]>;
  findById(id: string): Promise<CmsCollection | null>;
  findBySlug(slug: string): Promise<CmsCollection | null>;
  create(collection: Omit<CmsCollection, "id" | "createdAt" | "updatedAt">): Promise<CmsCollection>;
  update(id: string, updates: Partial<Omit<CmsCollection, "id" | "createdAt" | "updatedAt">>): Promise<CmsCollection>;
  delete(id: string): Promise<void>;

  // Records
  findRecords(collectionId: string): Promise<CmsCollectionRecord[]>;
  findRecordById(collectionId: string, recordId: string): Promise<CmsCollectionRecord | null>;
  createRecord(record: Omit<CmsCollectionRecord, "id" | "createdAt" | "updatedAt">): Promise<CmsCollectionRecord>;
  updateRecord(collectionId: string, recordId: string, data: Record<string, unknown>): Promise<CmsCollectionRecord>;
  deleteRecord(collectionId: string, recordId: string): Promise<void>;
}
