import type { StorageAdapter } from "./StorageAdapter";

/**
 * In-memory storage adapter for testing.
 * All data is lost when the process ends.
 */
export class InMemoryAdapter implements StorageAdapter {
  private store = new Map<string, Map<string, unknown>>();

  private collection(name: string): Map<string, unknown> {
    if (!this.store.has(name)) {
      this.store.set(name, new Map());
    }
    return this.store.get(name)!;
  }

  async getAll<T>(collection: string, filter?: Partial<Record<string, unknown>>): Promise<T[]> {
    const col = this.collection(collection);
    let records = Array.from(col.values()) as T[];

    if (filter) {
      records = records.filter((record) =>
        Object.entries(filter).every(
          ([key, value]) => (record as Record<string, unknown>)[key] === value,
        ),
      );
    }

    return records;
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    const col = this.collection(collection);
    return (col.get(id) as T) ?? null;
  }

  async create<T extends { id: string }>(collection: string, data: T): Promise<T> {
    const col = this.collection(collection);
    col.set(data.id, data);
    return data;
  }

  async update<T extends { id: string }>(
    collection: string,
    id: string,
    data: Partial<T>,
  ): Promise<T> {
    const col = this.collection(collection);
    const existing = col.get(id) as T | undefined;
    if (!existing) {
      throw new Error(`[InMemoryAdapter] Record "${id}" not found in "${collection}"`);
    }
    const updated = { ...existing, ...data };
    col.set(id, updated);
    return updated;
  }

  async delete(collection: string, id: string): Promise<void> {
    this.collection(collection).delete(id);
  }

  /** Clear all data (useful between tests). */
  reset(): void {
    this.store.clear();
  }
}
