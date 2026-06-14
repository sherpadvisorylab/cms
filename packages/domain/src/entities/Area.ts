/** Font reference (custom or icon font loaded via URL) */
export interface CmsFont {
  name: string;
  url: string;
}

/** Single color schema (an area can have multiple; one is default) */
export interface CmsColorSchema {
  id: number;
  name: string;
  colors: Record<string, string>;
  isDefault?: boolean;
}

/** Area style: logos, favicon, fonts, color schemas */
export interface CmsAreaStyle {
  logoLight?: string;
  logoDark?: string;
  favicon?: string;
  customFonts?: CmsFont[];
  iconFonts?: CmsFont[];
  colorSchemas?: CmsColorSchema[];
  defaultColorSchemaId?: number;
}

/** Body element: a custom design variable and its HTML content */
export interface CmsBodyElement {
  variable: string;
  content: string;
}

/** Area design: head/body templates, body elements, area-level CSS/JS */
export interface CmsAreaDesign {
  headTemplate?: string;
  bodyTemplate?: string;
  bodyElements?: CmsBodyElement[];
  areaCss?: string;
  areaJs?: string;
}

/** Single legal page (title, path, rich-text content) */
export interface CmsLegalPage {
  title: string;
  path: string;
  content: string;
}

/** Cookie consent category */
export interface CmsCookieCategory {
  id: string;
  name?: string;
  shortDescription?: string;
  description?: string;
  enabled: boolean;
  custom?: boolean;
}

/** Cookie consent bar configuration */
export interface CmsCookieBar {
  enabled: boolean;
  label?: string;
  description?: string;
  categories?: CmsCookieCategory[];
}

/** Area legal: legal pages + cookie bar */
export interface CmsAreaLegal {
  pages?: CmsLegalPage[];
  cookieBar?: CmsCookieBar;
}

/** Custom tracking script */
export interface CmsTrackingScript {
  name: string;
  code: string;
  position: "head" | "body-top" | "body-bottom";
}

/** Area tracking: GA, GTM, custom scripts with position */
export interface CmsAreaTracking {
  gaId?: string;
  gaPosition?: string;
  gtmId?: string;
  gtmPosition?: string;
  customScripts?: CmsTrackingScript[];
}

/** Area access policy: restricted area with auth pages */
export interface CmsAreaAccessPolicy {
  isRestricted: boolean;
  redirectUrl?: string;
  registrationEnabled?: boolean;
  registrationPage?: string;
  recoverPasswordEnabled?: boolean;
  recoverPasswordPage?: string;
}

/**
 * Built-in system page types.
 * New types can be added without breaking existing data.
 */
export type SystemPageType = "home" | "404" | string;

/** Full CMS Area entity */
export interface CmsArea {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  badgeColor?: string;
  icon?: string;
  siteName?: string;
  rootPath?: string;
  status: "active" | "inactive";
  pagesCount?: number;
  /**
   * IETF BCP 47 locale code served at rootPath (e.g. "it").
   * Pages with this locale are accessible without a locale prefix.
   * Falls back to SHERPA_DEFAULT_LOCALE env var when not set.
   */
  defaultLocale?: string | null;
  /**
   * All locale codes supported by this area (e.g. ["it", "en", "fr"]).
   * Non-default locales are served at /<locale>/... paths.
   * Pages with a locale not in this list cannot be published.
   */
  supportedLocales?: string[] | null;
  style?: CmsAreaStyle;
  design?: CmsAreaDesign;
  legal?: CmsAreaLegal;
  tracking?: CmsAreaTracking;
  accessPolicy?: CmsAreaAccessPolicy;
  /**
   * Maps system page type → pageId for this area.
   * e.g. { home: "abc123", "404": "xyz456" }
   * The referenced pages have special routing behaviour:
   *   - "home" → served at the area root path (/)
   *   - "404"  → rendered when no page matches the requested slug
   */
  systemPages?: Record<SystemPageType, string>;
  createdAt?: Date;
  updatedAt?: Date;
}
