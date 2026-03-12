import type {
  FieldDefinition,
  FormSchema,
  GroupDefinition,
  Validator,
  VisibilityRule,
} from "../types";

export class FormValidator {
  private static VALIDATORS: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/,
    phone: /^\+?[\d\s\-()]+$/,
  };

  /**
   * Evaluate a single visibility rule against current form values.
   */
  static evaluateRule(
    rule: VisibilityRule,
    values: Record<string, unknown>
  ): boolean {
    const fieldValue = String(values[rule.dependsOn] ?? "");
    switch (rule.operator) {
      case "equals":
        return fieldValue === rule.value;
      case "not_equals":
        return fieldValue !== rule.value;
      case "in":
        return Array.isArray(rule.value) && rule.value.includes(fieldValue);
      case "not_in":
        return Array.isArray(rule.value) && !rule.value.includes(fieldValue);
      default:
        return true;
    }
  }

  /**
   * Check if a field should be visible given current form values.
   * A field is visible if it has no visibility rules, or ALL rules pass.
   */
  static isFieldVisible(
    field: FieldDefinition,
    values: Record<string, unknown>
  ): boolean {
    if (!field.visibilityRules?.length) return true;
    return field.visibilityRules.every((r) => this.evaluateRule(r, values));
  }

  /**
   * Check if a group should be visible given current form values.
   */
  static isGroupVisible(
    group: GroupDefinition,
    values: Record<string, unknown>
  ): boolean {
    if (!group.visibilityRules?.length) return true;
    return group.visibilityRules.every((r) => this.evaluateRule(r, values));
  }

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

    // Max length check
    if (
      field.maxLength &&
      typeof value === "string" &&
      value.length > field.maxLength
    ) {
      return `${field.label} exceeds maximum length of ${field.maxLength} characters`;
    }

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
   * Validate all fields in a form, skipping hidden groups/fields.
   * Returns a map of field IDs to error messages.
   */
  static validateForm(
    schema: FormSchema,
    values: Record<string, unknown>
  ): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const group of schema.groups) {
      if (!this.isGroupVisible(group, values)) continue;
      for (const field of group.fields) {
        if (!this.isFieldVisible(field, values)) continue;
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
