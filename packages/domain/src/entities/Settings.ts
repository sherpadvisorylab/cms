/**
 * Platform-wide CMS settings (singleton).
 * Branding, authentication/SSO, email defaults, system variable defaults.
 */
export interface CmsSettings {
  id: string;

  /** Branding & defaults */
  branding?: CmsSettingsBranding;

  /** SEO — canonical host override and robots.txt content */
  seo?: CmsSettingsSeo;

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

/** Per-locale routing configuration. */
export interface CmsLocaleEntry {
  /** BCP 47 locale code, e.g. "it", "en", "fr". */
  code: string;
  /** URL path prefix for this locale. Default locale is typically "/", others "/en", "/fr" etc. */
  rootPath: string;
  /** True for exactly one locale — the one served at rootPath ("/"). */
  isDefault?: boolean;
}

export interface CmsSettingsBranding {
  projectName?: string;
  siteUrl?: string;
  /** Default locale code (kept for monolingual fallback and backward compat). Authoritative value comes from locales[isDefault].code when multi-language is enabled. */
  defaultLanguage?: string;
  /** Whether multi-language routing is active. When false the site behaves as mono-lingual. */
  multiLanguageEnabled?: boolean;
  /** Ordered locale configurations. Replaces the flat supportedLocales array. */
  locales?: CmsLocaleEntry[];
  /** Flat list of supported locale codes — kept in sync with locales[] for backward compat. */
  supportedLocales?: string[];
  defaultTimezone?: string;
  logoLight?: string;
  logoDark?: string;
  defaultColorSchema?: Record<string, string>;
  defaultFont?: string;
  defaultIconFont?: string;
  favicon?: string;
}

export interface CmsSettingsSeo {
  /** Explicit host used for all canonical URLs, e.g. "https://example.com". Overrides branding.siteUrl. */
  canonicalHost?: string;
  /** Full content served at /robots.txt */
  robotsTxt?: string;
  /** Full content served at /llms.txt */
  llmsTxt?: string;
}

export interface CmsSettingsAuthentication {
  ssoEnabled?: boolean;
}

export interface CmsSettingsEmailDefaults {
  senderName?: string;
  senderEmail?: string;
}
