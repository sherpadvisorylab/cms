/**
 * Platform-wide CMS settings (singleton).
 * Branding, authentication/SSO, email defaults, system variable defaults.
 */
export interface CmsSettings {
  id: string;

  /** Branding & defaults */
  branding?: CmsSettingsBranding;

  /** Authentication / SSO */
  authentication?: CmsSettingsAuthentication;

  /** Email defaults (sender) */
  emailDefaults?: CmsSettingsEmailDefaults;

  /** System variable default values (built-in + custom) */
  systemVariableDefaults?: Record<string, string>;

  /** Custom variable keys (user-added beyond built-in) */
  customVariableKeys?: string[];
}

export interface CmsSettingsBranding {
  projectName?: string;
  defaultLanguage?: string;
  defaultTimezone?: string;
  logoLight?: string;
  logoDark?: string;
  defaultColorSchema?: Record<string, string>;
  defaultFont?: string;
  defaultIconFont?: string;
  favicon?: string;
}

export interface CmsSettingsAuthentication {
  ssoEnabled?: boolean;
}

export interface CmsSettingsEmailDefaults {
  senderName?: string;
  senderEmail?: string;
}
