import type { StorageAdapter } from "./StorageAdapter";

/**
 * Browser localStorage adapter for demos and prototyping.
 * NOT suitable for server-side rendering.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix = "cms") {
    this.prefix = prefix;
  }

  private key(collection: string): string {
    return `${this.prefix}:${collection}`;
  }

  private read<T>(collection: string): Map<string, T> {
    try {
      const raw = localStorage.getItem(this.key(collection));
      if (!raw) return new Map();
      const entries = JSON.parse(raw) as [string, T][];
      return new Map(entries);
    } catch {
      return new Map();
    }
  }

  private write<T>(collection: string, map: Map<string, T>): void {
    localStorage.setItem(this.key(collection), JSON.stringify(Array.from(map.entries())));
  }

  async getAll<T>(collection: string, filter?: Partial<Record<string, unknown>>): Promise<T[]> {
    const map = this.read<T>(collection);
    let records = Array.from(map.values());

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
    const map = this.read<T>(collection);
    return map.get(id) ?? null;
  }

  async create<T extends { id: string }>(collection: string, data: T): Promise<T> {
    const map = this.read<T>(collection);
    map.set(data.id, data);
    this.write(collection, map);
    return data;
  }

  async update<T extends { id: string }>(
    collection: string,
    id: string,
    data: Partial<T>,
  ): Promise<T> {
    const map = this.read<T>(collection);
    const existing = map.get(id);
    if (!existing) {
      throw new Error(`[LocalStorageAdapter] Record "${id}" not found in "${collection}"`);
    }
    const updated = { ...existing, ...data };
    map.set(id, updated);
    this.write(collection, map);
    return updated;
  }

  async delete(collection: string, id: string): Promise<void> {
    const map = this.read(collection);
    map.delete(id);
    this.write(collection, map);
  }
}
