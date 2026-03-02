import type { CmsSettings, ISettingsRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";

const SETTINGS_ID = "global";

export class SettingsRepository implements ISettingsRepository {
  constructor(private adapter: StorageAdapter) {}

  async get(): Promise<CmsSettings | null> {
    return this.adapter.getById<CmsSettings>("settings", SETTINGS_ID);
  }

  async save(settings: CmsSettings): Promise<CmsSettings> {
    const existing = await this.get();
    const data: CmsSettings = { ...settings, id: SETTINGS_ID };
    if (existing) {
      return this.adapter.update<CmsSettings>("settings", SETTINGS_ID, data);
    }
    return this.adapter.create("settings", data);
  }

  async update(updates: Partial<CmsSettings>): Promise<CmsSettings> {
    const existing = await this.get();
    if (!existing) {
      const data: CmsSettings = { ...updates, id: SETTINGS_ID } as CmsSettings;
      return this.adapter.create("settings", data);
    }
    return this.adapter.update<CmsSettings>("settings", SETTINGS_ID, updates);
  }
}
