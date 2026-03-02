/**
 * Platform user managed in the CMS admin area.
 * Role is a string (from configurable Roles component, not a fixed enum).
 */
export interface CmsUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  company?: string;
  lastLogin?: string;
}
