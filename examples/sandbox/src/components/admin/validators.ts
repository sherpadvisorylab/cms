// ── Predefined field validators ───────────────────────────────────────────────
// Used in both the component editor (PlacementRows) and the page content editor
// (ValidatedFieldInput) to enforce field constraints.

export const PREDEFINED_VALIDATORS: Record<string, { label: string; pattern: RegExp; error: string }> = {
  email:   { label: "Email",            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,  error: "Enter a valid email address" },
  url:     { label: "URL",              pattern: /^https?:\/\/.+/,              error: "Enter a valid URL (https://…)" },
  phone:   { label: "Phone number",     pattern: /^[+\d\s\-().]+$/,             error: "Enter a valid phone number" },
  number:  { label: "Number",           pattern: /^-?\d+(\.\d+)?$/,             error: "Enter a valid number" },
  integer: { label: "Integer",          pattern: /^-?\d+$/,                     error: "Enter a whole number" },
  date:    { label: "Date (YYYY-MM-DD)", pattern: /^\d{4}-\d{2}-\d{2}$/,        error: "Enter a date as YYYY-MM-DD" },
  slug:    { label: "Slug",             pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, error: "Lowercase letters, numbers and hyphens only" },
};

/** Returns a validation error message or null if the value is valid. */
export function validateFieldValue(
  value: unknown,
  field: { required?: boolean; validator?: string },
): string | null {
  const str = String(value ?? "").trim();

  if (field.required && !str) return "This field is required";

  if (field.validator && str) {
    const predefined = PREDEFINED_VALIDATORS[field.validator];
    if (predefined) {
      if (!predefined.pattern.test(str)) return predefined.error;
    } else {
      // Custom regex: /pattern/ or /pattern/flags
      try {
        const m = field.validator.match(/^\/(.+)\/([gimsuy]*)$/);
        if (m && !new RegExp(m[1], m[2]).test(str)) return "Invalid format";
      } catch { /* ignore malformed regex */ }
    }
  }

  return null;
}
