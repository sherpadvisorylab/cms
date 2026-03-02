import { describe, it, expect } from "vitest";
import { FormRenderer } from "../core/FormRenderer";
import type { FormSchema } from "../types";

const basicSchema: FormSchema = {
  groups: [
    {
      id: "g1",
      label: "Personal Info",
      orderIndex: 0,
      fields: [
        {
          id: "first-name",
          groupId: "g1",
          label: "First Name",
          type: "text",
          required: true,
          width: "col-6",
          validator: "none",
          orderIndex: 0,
        },
        {
          id: "email-field",
          groupId: "g1",
          label: "Email",
          type: "email",
          required: false,
          width: "col-6",
          validator: "email",
          orderIndex: 1,
        },
      ],
    },
  ],
};

describe("FormRenderer.renderForm", () => {
  it("returns a string starting with <form", () => {
    const html = FormRenderer.renderForm(basicSchema);
    expect(html).toMatch(/^<form/);
    expect(html).toMatch(/<\/form>$/);
  });

  it("renders all group labels", () => {
    const html = FormRenderer.renderForm(basicSchema);
    expect(html).toContain("Personal Info");
  });

  it("renders text input for type=text field", () => {
    const html = FormRenderer.renderForm(basicSchema);
    expect(html).toContain('type="text"');
    expect(html).toContain("First Name");
  });

  it("renders email input for type=email field", () => {
    const html = FormRenderer.renderForm(basicSchema);
    expect(html).toContain('type="email"');
    expect(html).toContain("Email");
  });

  it("marks required fields", () => {
    const html = FormRenderer.renderForm(basicSchema);
    expect(html).toContain("required");
  });

  it("renders a submit button", () => {
    const html = FormRenderer.renderForm(basicSchema);
    expect(html).toContain('type="submit"');
  });

  it("renders textarea for type=textarea field", () => {
    const schema: FormSchema = {
      groups: [
        {
          id: "g",
          label: "G",
          orderIndex: 0,
          fields: [
            {
              id: "desc",
              groupId: "g",
              label: "Description",
              type: "textarea",
              required: false,
              width: "col-12",
              validator: "none",
              orderIndex: 0,
            },
          ],
        },
      ],
    };
    const html = FormRenderer.renderForm(schema);
    expect(html).toContain("<textarea");
  });

  it("renders select for type=select field", () => {
    const schema: FormSchema = {
      groups: [
        {
          id: "g",
          label: "G",
          orderIndex: 0,
          fields: [
            {
              id: "stage",
              groupId: "g",
              label: "Stage",
              type: "select",
              required: false,
              width: "col-6",
              validator: "none",
              orderIndex: 0,
              options: [
                { id: "o1", label: "Idea", value: "idea", isDefault: false, orderIndex: 0 },
                { id: "o2", label: "MVP", value: "mvp", isDefault: false, orderIndex: 1 },
              ],
            },
          ],
        },
      ],
    };
    const html = FormRenderer.renderForm(schema);
    expect(html).toContain("<select");
    expect(html).toContain("Idea");
    expect(html).toContain("MVP");
  });

  it("renders consent checkboxes when provided", () => {
    const schema: FormSchema = {
      groups: [],
      consentFields: [
        {
          label: "terms",
          text: "I agree to the terms",
          required: true,
        },
      ],
    };
    const html = FormRenderer.renderForm(schema);
    expect(html).toContain("I agree to the terms");
    expect(html).toContain('type="checkbox"');
  });

  it("escapes HTML in group labels to prevent XSS", () => {
    const schema: FormSchema = {
      groups: [
        {
          id: "g",
          label: '<script>alert("xss")</script>',
          orderIndex: 0,
          fields: [],
        },
      ],
    };
    const html = FormRenderer.renderForm(schema);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("works in Node.js without DOM (SSR-safe)", () => {
    // If this test runs in Node.js environment without crashing, FormRenderer is SSR-safe
    expect(() => FormRenderer.renderForm(basicSchema)).not.toThrow();
  });
});
