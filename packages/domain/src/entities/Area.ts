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
  style?: CmsAreaStyle;
  design?: CmsAreaDesign;
  legal?: CmsAreaLegal;
  tracking?: CmsAreaTracking;
  accessPolicy?: CmsAreaAccessPolicy;
  createdAt?: Date;
  updatedAt?: Date;
}
