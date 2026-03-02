import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "../adapters/InMemoryAdapter";
import { NavigationRepository } from "../repositories/NavigationRepository";

describe("NavigationRepository", () => {
  let adapter: InMemoryAdapter;
  let repo: NavigationRepository;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    repo = new NavigationRepository(adapter);
  });

  it("creates a navigation block and finds it by id", async () => {
    const nav = await repo.create({
      name: "Main Header",
      items: [{ type: "page", label: "Home", url: "/" }],
      template: "<ul>{% for item in items %}<li>{{ item.label }}</li>{% endfor %}</ul>",
    });

    const found = await repo.findById(nav.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Main Header");
    expect(found!.items).toHaveLength(1);
  });

  it("findAll returns all navigation blocks", async () => {
    await repo.create({ name: "Header", items: [] });
    await repo.create({ name: "Footer", items: [] });

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it("updates a navigation block", async () => {
    const nav = await repo.create({ name: "Header", items: [] });
    const updated = await repo.update(nav.id, { name: "Main Header" });
    expect(updated.name).toBe("Main Header");
  });

  it("deletes a navigation block", async () => {
    const nav = await repo.create({ name: "To Delete", items: [] });
    await repo.delete(nav.id);
    const found = await repo.findById(nav.id);
    expect(found).toBeNull();
  });

  it("stores additionalCss and additionalJs", async () => {
    const nav = await repo.create({
      name: "Styled Nav",
      items: [],
      template: "<nav></nav>",
      additionalCss: ".nav { color: red; }",
      additionalJs: "console.log('nav');",
    });

    const found = await repo.findById(nav.id);
    expect(found!.additionalCss).toBe(".nav { color: red; }");
    expect(found!.additionalJs).toBe("console.log('nav');");
  });

  it("stores items with custom properties", async () => {
    const nav = await repo.create({
      name: "Custom Props",
      items: [
        { type: "custom", label: "Docs", url: "/docs", icon: "fa-book", badge: "New" },
      ],
    });

    const found = await repo.findById(nav.id);
    const item = found!.items[0];
    expect(item.label).toBe("Docs");
    expect(item.icon).toBe("fa-book");
    expect(item.badge).toBe("New");
  });
});
