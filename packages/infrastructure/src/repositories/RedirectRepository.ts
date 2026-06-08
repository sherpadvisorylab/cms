import type { CmsRedirect, IRedirectRepository } from "@sherpacms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class RedirectRepository implements IRedirectRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  async findAll(): Promise<CmsRedirect[]> {
    const records = await this.adapter.getAll<CmsRedirect>("redirects");
    return records.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async findById(id: string): Promise<CmsRedirect | null> {
    const records = await this.adapter.getAll<CmsRedirect>("redirects");
    return records.find((r) => r.id === id) ?? null;
  }

  async create(data: Omit<CmsRedirect, "id" | "createdAt" | "updatedAt">): Promise<CmsRedirect> {
    const now = new Date();
    const record: CmsRedirect = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    return this.adapter.create<CmsRedirect>("redirects", record);
  }

  async update(id: string, data: Partial<Omit<CmsRedirect, "id" | "createdAt">>): Promise<CmsRedirect> {
    return this.adapter.update<CmsRedirect>("redirects", id, { ...data, updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("redirects", id);
  }
}
