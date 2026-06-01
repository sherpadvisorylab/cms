CREATE TABLE "cms_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"description" text,
	"badge_color" text,
	"icon" text,
	"site_name" text,
	"root_path" text DEFAULT '/' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"pages_count" integer DEFAULT 0,
	"style" jsonb DEFAULT '{}'::jsonb,
	"design" jsonb DEFAULT '{}'::jsonb,
	"legal" jsonb DEFAULT '{}'::jsonb,
	"tracking" jsonb DEFAULT '{}'::jsonb,
	"access_policy" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_component_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"component_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"template_liquid" text DEFAULT '',
	"schema" jsonb DEFAULT '[]'::jsonb,
	"css" text DEFAULT '',
	"js" text DEFAULT '',
	"schema_org_template" text DEFAULT '',
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_components" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"namespace" text,
	"type" text DEFAULT 'page' NOT NULL,
	"category" text,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"preview_image_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_email_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"template_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"subject" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cms_email_templates_template_key_unique" UNIQUE("template_key")
);
--> statement-breakpoint
CREATE TABLE "cms_forms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"variable" text NOT NULL,
	"schema" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "cms_forms_variable_unique" UNIQUE("variable")
);
--> statement-breakpoint
CREATE TABLE "cms_layout_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"type" text NOT NULL,
	"html" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_menus" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"template_liquid" text DEFAULT '',
	"items" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "cms_menus_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "cms_navigations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb,
	"template" text DEFAULT '',
	"additional_css" text DEFAULT '',
	"additional_js" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "cms_page_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"structure" jsonb DEFAULT '[]'::jsonb,
	"content" jsonb DEFAULT '{}'::jsonb,
	"published_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"parent_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"structure" jsonb DEFAULT '[]'::jsonb,
	"content" jsonb DEFAULT '{}'::jsonb,
	"seo" jsonb DEFAULT '{}'::jsonb,
	"style" jsonb DEFAULT '{}'::jsonb,
	"seo_title" text,
	"seo_description" text,
	"og_image_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb,
	"authentication" jsonb DEFAULT '{}'::jsonb,
	"email_defaults" jsonb DEFAULT '{}'::jsonb,
	"system_variable_defaults" jsonb DEFAULT '{}'::jsonb,
	"custom_variable_keys" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "cms_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"structure" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"company" text,
	"last_login" timestamp with time zone,
	CONSTRAINT "cms_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cms_component_versions" ADD CONSTRAINT "cms_component_versions_component_id_cms_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."cms_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_page_versions" ADD CONSTRAINT "cms_page_versions_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;