import { describe, it, expect } from "vitest";
import { FormValidator } from "../core/FormValidator";
import type { FieldDefinition, FormSchema } from "../types";

function makeField(overrides: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    id: "field-1",
    groupId: "group-1",
    label: "Test Field",
    type: "text",
    required: false,
    width: "col-6",
    validator: "none",
    orderIndex: 0,
    ...overrides,
  };
}

describe("FormValidator.validateField", () => {
  it("returns null for valid non-required empty field", () => {
    const field = makeField({ required: false });
    expect(FormValidator.validateField(field, "")).toBeNull();
  });

  it("returns error for missing required field", () => {
    const field = makeField({ required: true });
    expect(FormValidator.validateField(field, "")).toBe("Test Field is required");
  });

  it("returns null for required field with a value", () => {
    const field = makeField({ required: true });
    expect(FormValidator.validateField(field, "hello")).toBeNull();
  });

  it("validates email correctly", () => {
    const field = makeField({ validator: "email" });
    expect(FormValidator.validateField(field, "bad-email")).toBe("Test Field is not a valid email");
    expect(FormValidator.validateField(field, "user@example.com")).toBeNull();
  });

  it("validates URL correctly", () => {
    const field = makeField({ validator: "url" });
    expect(FormValidator.validateField(field, "not-a-url")).toBe("Test Field is not a valid url");
    expect(FormValidator.validateField(field, "https://example.com")).toBeNull();
  });

  it("validates phone correctly", () => {
    const field = makeField({ validator: "phone" });
    expect(FormValidator.validateField(field, "abc")).toBe("Test Field is not a valid phone");
    expect(FormValidator.validateField(field, "+65 9123 4567")).toBeNull();
  });

  it("validates custom regex", () => {
    const field = makeField({
      validator: { pattern: "^[A-Z]{2,3}$", message: "Must be 2-3 uppercase letters" },
    });
    expect(FormValidator.validateField(field, "abc")).toBe("Must be 2-3 uppercase letters");
    expect(FormValidator.validateField(field, "AB")).toBeNull();
  });

  it("skips validation if value is empty and field is not required", () => {
    const field = makeField({ validator: "email", required: false });
    expect(FormValidator.validateField(field, "")).toBeNull();
    expect(FormValidator.validateField(field, null)).toBeNull();
  });
});

describe("FormValidator.validateForm", () => {
  const schema: FormSchema = {
    groups: [
      {
        id: "g1",
        label: "Contact",
        orderIndex: 0,
        fields: [
          makeField({ id: "name", label: "Name", required: true }),
          makeField({ id: "email", label: "Email", required: true, validator: "email" }),
        ],
      },
    ],
  };

  it("returns empty object when all required fields are filled correctly", () => {
    const errors = FormValidator.validateForm(schema, { name: "Alice", email: "alice@example.com" });
    expect(errors).toEqual({});
  });

  it("returns errors for missing required fields", () => {
    const errors = FormValidator.validateForm(schema, { name: "", email: "" });
    expect(errors["name"]).toBeDefined();
    expect(errors["email"]).toBeDefined();
  });

  it("returns error for invalid email but not for empty non-required field", () => {
    const errors = FormValidator.validateForm(schema, { name: "Bob", email: "not-valid" });
    expect(errors["name"]).toBeUndefined();
    expect(errors["email"]).toBeDefined();
  });
});

describe("FormValidator.isValid", () => {
  const schema: FormSchema = {
    groups: [
      {
        id: "g1",
        label: "G",
        orderIndex: 0,
        fields: [makeField({ id: "f1", label: "F1", required: true })],
      },
    ],
  };

  it("returns true when form is valid", () => {
    expect(FormValidator.isValid(schema, { f1: "hello" })).toBe(true);
  });

  it("returns false when form has errors", () => {
    expect(FormValidator.isValid(schema, { f1: "" })).toBe(false);
  });
});
