/**
 * Pluggable storage adapter interface.
 *
 * The CMS library is storage-agnostic. Provide your own adapter:
 *   - LocalStorageAdapter  — browser, for demos/prototyping
 *   - InMemoryAdapter      — for tests
 *   - PrismaAdapter        — production (implemented by the consumer, e.g. espressolab)
 */
export interface StorageAdapter {
  /** Return all records in a collection, optionally filtered by field equality. */
  getAll<T>(collection: string, filter?: Partial<Record<string, unknown>>): Promise<T[]>;

  /** Return a single record by id, or null if not found. */
  getById<T>(collection: string, id: string): Promise<T | null>;

  /** Create a new record (id is caller-supplied). */
  create<T extends { id: string }>(collection: string, data: T): Promise<T>;

  /** Update fields on an existing record by id. Returns the updated record. */
  update<T extends { id: string }>(collection: string, id: string, data: Partial<T>): Promise<T>;

  /** Delete a record by id. No-op if not found. */
  delete(collection: string, id: string): Promise<void>;
}
