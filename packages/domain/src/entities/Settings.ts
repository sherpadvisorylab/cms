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

  /** Global site/style variables available in Liquid editors */
  variables?: CmsVariableDefinition[];
}

export type CmsVariableNamespace = "site" | "styles";
export type CmsVariableType = "text" | "url" | "image" | "select";

export interface CmsVariableOption {
  label: string;
  value: string;
}

export interface CmsVariableDefinition {
  namespace: CmsVariableNamespace;
  key: string;
  label: string;
  description?: string;
  type: CmsVariableType;
  value?: string;
  options?: CmsVariableOption[];
}

export interface CmsSettingsBranding {
  projectName?: string;
  siteUrl?: string;
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
