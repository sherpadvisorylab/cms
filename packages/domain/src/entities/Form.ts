/**
 * CMS Form definition for {{form:variable}} embedding.
 * Schema is typed as `unknown` to avoid circular dependency with @cms/form-generator.
 * At runtime the CMS package casts it to FormSchema when rendering.
 */
export interface CmsForm {
  id: string;
  name: string;
  /** Normalized name used as embed variable: {{form:variable}} */
  variable: string;
  /** Form schema (groups, fields) — typed as unknown to decouple from form-generator */
  schema?: unknown;
}
