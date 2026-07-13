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

  /**
   * Paginated lookup used by AI bulk-translation: returns records ordered by a stable cursor (id),
   * optionally filtered to only those still missing a translation for `locale` on at least one of
   * `translatableKeys`. The repository does not read the collection schema itself — callers compute
   * `translatableKeys` from `CmsCollection.schema` and pass them in.
   */
  findRecordsPage(
    collectionId: string,
    opts: { cursor?: string | null; limit: number; translatableKeys?: string[]; locale?: string },
  ): Promise<{ items: CmsCollectionRecord[]; nextCursor: string | null }>;

  /** Merges `patch` into `record.translations[locale]` without touching `data` or other locales. */
  updateRecordTranslations(
    collectionId: string,
    recordId: string,
    locale: string,
    patch: Record<string, unknown>,
  ): Promise<CmsCollectionRecord>;
}
