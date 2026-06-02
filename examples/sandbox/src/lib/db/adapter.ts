import { eq, and } from "drizzle-orm";
import type { StorageAdapter } from "@sherpacms/infrastructure";
import { db } from "./index";
import { COLLECTION_MAP, type CollectionName } from "./schema";

/**
 * Drizzle-based StorageAdapter for @cms/cms.
 * Maps the CMS collection names to Drizzle table objects backed by Supabase Postgres.
 */
export class DrizzleAdapter implements StorageAdapter {
  private tableFor(collection: string) {
    const table = COLLECTION_MAP[collection as CollectionName];
    if (!table) {
      throw new Error(
        `DrizzleAdapter: unknown collection "${collection}". ` +
          `Known: ${Object.keys(COLLECTION_MAP).join(", ")}`
      );
    }
    return table;
  }

  async getAll<T>(
    collection: string,
    filter?: Partial<Record<string, unknown>>
  ): Promise<T[]> {
    const table = this.tableFor(collection);

    const activeFilters = filter
      ? Object.entries(filter).filter(([, v]) => v !== undefined)
      : [];

    if (activeFilters.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return db.select().from(table as any) as unknown as Promise<T[]>;
    }

    const conditions = activeFilters.map(([key, value]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const col = (table as any)[key];
      if (!col) {
        throw new Error(
          `DrizzleAdapter.getAll: field "${key}" not found on collection "${collection}"`
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return eq(col, value as any);
    });

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await db.select().from(table as any).where(where as any);
    return results as unknown as T[];
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    const table = this.tableFor(collection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await db.select().from(table as any).where(eq((table as any).id, id));
    return (results[0] ?? null) as T | null;
  }

  async create<T extends { id: string }>(
    collection: string,
    data: T
  ): Promise<T> {
    const table = this.tableFor(collection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await db.insert(table as any).values(data as any).returning();
    return results[0] as T;
  }

  async update<T extends { id: string }>(
    collection: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    const table = this.tableFor(collection);
    const results = await db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(table as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(data as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((table as any).id, id))
      .returning();

    if (!results[0]) {
      throw new Error(`DrizzleAdapter.update: record not found ${collection}/${id}`);
    }
    return results[0] as T;
  }

  async delete(collection: string, id: string): Promise<void> {
    const table = this.tableFor(collection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.delete(table as any).where(eq((table as any).id, id));
  }
}
