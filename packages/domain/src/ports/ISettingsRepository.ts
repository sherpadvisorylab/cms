import type { CmsSettings } from "../entities/Settings";

export interface ISettingsRepository {
  /** Get the singleton settings object (returns null if not initialized) */
  get(): Promise<CmsSettings | null>;
  /** Create or overwrite settings */
  save(settings: CmsSettings): Promise<CmsSettings>;
  /** Partial update of the singleton settings */
  update(updates: Partial<CmsSettings>): Promise<CmsSettings>;
}
