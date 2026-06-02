import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// ── Areas ─────────────────────────────────────────────────────────────────────
export const cmsAreas = pgTable("cms_areas", {
  id:           text("id").primaryKey(),
  name:         text("name").notNull(),
  displayName:  text("display_name").notNull().default(""),
  description:  text("description"),
  badgeColor:   text("badge_color"),
  icon:         text("icon"),
  siteName:     text("site_name"),
  rootPath:     text("root_path").notNull().default("/"),
  status:       text("status").notNull().default("active"),
  pagesCount:   integer("pages_count").default(0),
  style:        jsonb("style").default({}),
  design:       jsonb("design").default({}),
  legal:        jsonb("legal").default({}),
  tracking:     jsonb("tracking").default({}),
  accessPolicy: jsonb("access_policy").default({}),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Pages ─────────────────────────────────────────────────────────────────────
export const cmsPages = pgTable("cms_pages", {
  id:             text("id").primaryKey(),
  area:           text("area").notNull(),
  slug:           text("slug").notNull(),
  title:          text("title").notNull(),
  parentId:       text("parent_id"),
  status:         text("status").notNull().default("draft"),
  structure:      jsonb("structure").default([]),
  content:        jsonb("content").default({}),
  seo:            jsonb("seo").default({}),
  style:          jsonb("style").default({}),
  seoTitle:       text("seo_title"),
  seoDescription: text("seo_description"),
  ogImageUrl:     text("og_image_url"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Page Versions ─────────────────────────────────────────────────────────────
export const cmsPageVersions = pgTable("cms_page_versions", {
  id:          text("id").primaryKey(),
  pageId:      text("page_id").notNull().references(() => cmsPages.id, { onDelete: "cascade" }),
  version:     integer("version").notNull().default(1),
  structure:   jsonb("structure").default([]),
  content:     jsonb("content").default({}),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdBy:   text("created_by"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Components ────────────────────────────────────────────────────────────────
export const cmsComponents = pgTable("cms_components", {
  id:              text("id").primaryKey(),
  name:            text("name").notNull(),
  namespace:       text("namespace"),
  type:            text("type").notNull().default("page"),
  category:        text("category"),
  description:     text("description"),
  status:          text("status").notNull().default("draft"),
  previewImageUrl: text("preview_image_url"),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Component Versions ────────────────────────────────────────────────────────
export const cmsComponentVersions = pgTable("cms_component_versions", {
  id:                text("id").primaryKey(),
  componentId:       text("component_id").notNull().references(() => cmsComponents.id, { onDelete: "cascade" }),
  version:           integer("version").notNull().default(1),
  templateLiquid:    text("template_liquid").default(""),
  schema:            jsonb("schema").default([]),
  css:               text("css").default(""),
  js:                text("js").default(""),
  schemaOrgTemplate: text("schema_org_template").default(""),
  createdBy:         text("created_by"),
  createdAt:         timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Menus ─────────────────────────────────────────────────────────────────────
export const cmsMenus = pgTable("cms_menus", {
  id:             text("id").primaryKey(),
  key:            text("key").notNull().unique(),
  label:          text("label").notNull(),
  templateLiquid: text("template_liquid").default(""),
  items:          jsonb("items").default([]),
});

// ── Navigations ───────────────────────────────────────────────────────────────
export const cmsNavigations = pgTable("cms_navigations", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  slug:          text("slug").default(""),
  items:         jsonb("items").default([]),
  template:      text("template").default(""),
  additionalCss: text("additional_css").default(""),
  additionalJs:  text("additional_js").default(""),
});

// ── Page Templates ────────────────────────────────────────────────────────────
export const cmsTemplates = pgTable("cms_templates", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description"),
  structure:   jsonb("structure").default([]),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Email Templates ───────────────────────────────────────────────────────────
export const cmsEmailTemplates = pgTable("cms_email_templates", {
  id:          text("id").primaryKey(),
  templateKey: text("template_key").notNull().unique(),
  name:        text("name").notNull(),
  description: text("description"),
  subject:     text("subject").notNull().default(""),
  body:        text("body").notNull().default(""),
  variables:   jsonb("variables").default([]),
  isSystem:    boolean("is_system").default(false),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Layout Templates (head/body HTML shells for areas) ────────────────────────
export const cmsLayoutTemplates = pgTable("cms_layout_templates", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description").default(""),
  type:        text("type").notNull().$type<"head" | "body">(),
  html:        text("html").notNull().default(""),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Forms ─────────────────────────────────────────────────────────────────────
export const cmsForms = pgTable("cms_forms", {
  id:       text("id").primaryKey(),
  name:     text("name").notNull(),
  variable: text("variable").notNull().unique(),
  schema:   jsonb("schema").default({}),
});

// ── Settings (singleton, id = 'global') ──────────────────────────────────────
export const cmsSettings = pgTable("cms_settings", {
  id:                     text("id").primaryKey().default("global"),
  branding:               jsonb("branding").default({}),
  authentication:         jsonb("authentication").default({}),
  emailDefaults:          jsonb("email_defaults").default({}),
  systemVariableDefaults: jsonb("system_variable_defaults").default({}),
  customVariableKeys:     jsonb("custom_variable_keys").default([]),
});

// ── Users ─────────────────────────────────────────────────────────────────────
export const cmsUsers = pgTable("cms_users", {
  id:        text("id").primaryKey(),
  name:      text("name").notNull(),
  email:     text("email").notNull().unique(),
  role:      text("role").notNull().default("editor"),
  status:    text("status").notNull().default("active"),
  company:   text("company"),
  lastLogin: timestamp("last_login", { withTimezone: true }),
});

// ── Page Structure Templates ──────────────────────────────────────────────────
export const cmsPageTemplates = pgTable("cms_page_templates", {
  id:        text("id").primaryKey(),
  name:      text("name").notNull(),
  structure: jsonb("structure").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Collection → Table map (used by DrizzleAdapter) ──────────────────────────
export const COLLECTION_MAP = {
  areas:             cmsAreas,
  pages:             cmsPages,
  pageVersions:      cmsPageVersions,
  components:        cmsComponents,
  componentVersions: cmsComponentVersions,
  menus:             cmsMenus,
  navigations:       cmsNavigations,
  templates:         cmsTemplates,
  emailTemplates:    cmsEmailTemplates,
  forms:             cmsForms,
  layoutTemplates:   cmsLayoutTemplates,
  settings:          cmsSettings,
  users:             cmsUsers,
} as const;

export type CollectionName = keyof typeof COLLECTION_MAP;
