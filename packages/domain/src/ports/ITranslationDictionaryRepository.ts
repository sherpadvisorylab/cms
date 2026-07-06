import type { CmsTranslationEntry } from "../entities/TranslationEntry";

export interface ITranslationDictionaryRepository {
  findAll(): Promise<CmsTranslationEntry[]>;
  findByKey(key: string): Promise<CmsTranslationEntry | null>;
  create(entry: Omit<CmsTranslationEntry, "id">): Promise<CmsTranslationEntry>;
  update(id: string, updates: Partial<CmsTranslationEntry>): Promise<CmsTranslationEntry>;
  delete(id: string): Promise<void>;
}
