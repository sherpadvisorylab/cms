import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "../adapters/InMemoryAdapter";
import { FormRepository } from "../repositories/FormRepository";

describe("FormRepository", () => {
  let adapter: InMemoryAdapter;
  let repo: FormRepository;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    repo = new FormRepository(adapter);
  });

  it("creates a form and finds it by id", async () => {
    const form = await repo.create({
      name: "Contact Form",
      variable: "contact_form",
      schema: { groups: [], fields: [] },
    });

    const found = await repo.findById(form.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Contact Form");
    expect(found!.variable).toBe("contact_form");
  });

  it("finds a form by variable name", async () => {
    await repo.create({
      name: "Apply Form",
      variable: "apply_form",
    });

    const found = await repo.findByVariable("apply_form");
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Apply Form");
  });

  it("returns null for non-existent variable", async () => {
    const found = await repo.findByVariable("no_such_form");
    expect(found).toBeNull();
  });

  it("findAll returns all forms", async () => {
    await repo.create({ name: "Form A", variable: "form_a" });
    await repo.create({ name: "Form B", variable: "form_b" });

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it("updates a form", async () => {
    const form = await repo.create({ name: "Old Name", variable: "old" });
    const updated = await repo.update(form.id, { name: "New Name" });
    expect(updated.name).toBe("New Name");
  });

  it("deletes a form", async () => {
    const form = await repo.create({ name: "To Delete", variable: "del" });
    await repo.delete(form.id);
    const found = await repo.findById(form.id);
    expect(found).toBeNull();
  });
});
