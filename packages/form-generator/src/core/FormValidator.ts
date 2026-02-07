import type { FieldDefinition, FormSchema, Validator } from "../types";

export class FormValidator {
  private static VALIDATORS: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/,
    phone: /^\+?[\d\s\-()]+$/,
  };

  /**
   * Validate a single field value.
   * Returns error message if invalid, null if valid.
   */
  static validateField(
    field: FieldDefinition,
    value: unknown
  ): string | null {
    // Required check
    if (field.required && !value) {
      return `${field.label} is required`;
    }

    // Skip validation if no value
    if (!value) return null;

    // Type-specific validation
    if (field.validator !== "none") {
      if (typeof field.validator === "string") {
        const regex = this.VALIDATORS[field.validator];
        if (regex && !regex.test(String(value))) {
          return `${field.label} is not a valid ${field.validator}`;
        }
      } else {
        // Custom regex validator
        const regex = new RegExp(field.validator.pattern);
        if (!regex.test(String(value))) {
          return field.validator.message;
        }
      }
    }

    return null;
  }

  /**
   * Validate all fields in a form.
   * Returns a map of field IDs to error messages.
   */
  static validateForm(
    schema: FormSchema,
    values: Record<string, unknown>
  ): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const group of schema.groups) {
      for (const field of group.fields) {
        const error = this.validateField(field, values[field.id]);
        if (error) {
          errors[field.id] = error;
        }
      }
    }

    return errors;
  }

  /**
   * Check if form is valid (no errors).
   */
  static isValid(
    schema: FormSchema,
    values: Record<string, unknown>
  ): boolean {
    const errors = this.validateForm(schema, values);
    return Object.keys(errors).length === 0;
  }
}
