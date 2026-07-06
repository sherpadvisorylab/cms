import type { CmsTranslationEntry, ITranslationDictionaryRepository } from "@sherpacms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class TranslationDictionaryRepository implements ITranslationDictionaryRepository {
  constructor(private adapter: StorageAdapter) {}

  async findAll(): Promise<CmsTranslationEntry[]> {
    return this.adapter.getAll<CmsTranslationEntry>("translations");
  }

  async findByKey(key: string): Promise<CmsTranslationEntry | null> {
    const all = await this.findAll();
    return all.find((entry) => entry.key === key) ?? null;
  }

  async create(entry: Omit<CmsTranslationEntry, "id">): Promise<CmsTranslationEntry> {
    const newEntry: CmsTranslationEntry = {
      ...entry,
      id: generateId(),
    };
    return this.adapter.create("translations", newEntry);
  }

  async update(id: string, updates: Partial<CmsTranslationEntry>): Promise<CmsTranslationEntry> {
    return this.adapter.update<CmsTranslationEntry>("translations", id, updates);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("translations", id);
  }
}
