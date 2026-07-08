import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "@sherpacms/infrastructure";
import { CMS } from "../src/CMS";

describe("relation fields", () => {
  let adapter: InMemoryAdapter;
  let cms: CMS;

  beforeEach(async () => {
    adapter = new InMemoryAdapter();
    cms = new CMS(adapter);
    await cms.areas.create({
      name: "public",
      status: "active",
      design: {
        headTemplate: "<head><title>{{page.metaTitle}}</title></head>",
        bodyTemplate: "<body>{{page.content}}</body>",
      },
    });
  });

  async function createPageWithComponent(slug: string, templateLiquid: string, schema: unknown, props: Record<string, unknown>) {
    const comp = await cms.components.create({ name: `comp-${slug}`, status: "published" });
    await cms.componentVersions.createVersion(comp.id, { templateLiquid, schema: schema as never });
    const page = await cms.pages.create({ area: "public", slug, title: slug, status: "published", structure: [] });
    await cms.pageVersions.createVersion(page.id, {
      structure: [{ componentId: comp.id, props }],
      publish: true,
    });
    return page;
  }

  it("'fields' mode: projects only the selected fields of linked records into an iterable array", async () => {
    const authors = await cms.collections.create({
      name: "Authors",
      slug: "authors",
      schema: [
        { key: "name", label: "Name", type: "text" },
        { key: "secret", label: "Secret", type: "text" },
      ],
      views: [],
    });
    const author = await cms.collections.createRecord({
      collectionId: authors.id,
      data: { name: "Ada Lovelace", secret: "should-not-leak" },
    });

    await createPageWithComponent(
      "post",
      "{% for a in related %}{{ a.name }}|{{ a.secret }}{% endfor %}",
      [{ key: "related", label: "Related", type: "relation", relationTarget: "authors", relationMode: "fields", relationFields: ["name"] }],
      { related: [author.id] },
    );

    const result = await cms.renderPage("public", "post");
    expect(result).toContain("Ada Lovelace|");
    expect(result).not.toContain("should-not-leak");
  });

  it("'view' mode: renders the target collection's view for the linked records as HTML", async () => {
    const authors = await cms.collections.create({
      name: "Authors",
      slug: "authors",
      schema: [{ key: "name", label: "Name", type: "text" }],
      views: [{ id: "v1", name: "Card", slug: "card", template: "{% for r in collection.records %}<span>{{ r.name }}</span>{% endfor %}", order: 0 }],
    });
    const ada = await cms.collections.createRecord({ collectionId: authors.id, data: { name: "Ada" } });
    await cms.collections.createRecord({ collectionId: authors.id, data: { name: "Grace" } });

    await createPageWithComponent(
      "post",
      "{{ related }}",
      [{ key: "related", label: "Related", type: "relation", relationTarget: "authors", relationMode: "view", relationViewSlug: "card" }],
      { related: [ada.id] },
    );

    const result = await cms.renderPage("public", "post");
    expect(result).toContain("<span>Ada</span>");
    expect(result).not.toContain("Grace");
  });

  it("silently drops IDs pointing at deleted/nonexistent records", async () => {
    const authors = await cms.collections.create({
      name: "Authors",
      slug: "authors",
      schema: [{ key: "name", label: "Name", type: "text" }],
      views: [],
    });
    const ada = await cms.collections.createRecord({ collectionId: authors.id, data: { name: "Ada" } });

    await createPageWithComponent(
      "post",
      "count={{ related.size }}",
      [{ key: "related", label: "Related", type: "relation", relationTarget: "authors", relationMode: "fields" }],
      { related: [ada.id, "does-not-exist"] },
    );

    const result = await cms.renderPage("public", "post");
    expect(result).toContain("count=1");
  });

  it("blocks A→B→A recursion in 'view' mode instead of looping forever", async () => {
    const catA = await cms.collections.create({
      name: "Cat A",
      slug: "cat-a",
      schema: [{ key: "toB", label: "To B", type: "relation", relationTarget: "cat-b", relationMode: "view", relationViewSlug: "view-b" }],
      views: [{ id: "va", name: "View A", slug: "view-a", template: "A:{% for r in collection.records %}{{ r.toB }}{% endfor %}", order: 0 }],
    });
    const catB = await cms.collections.create({
      name: "Cat B",
      slug: "cat-b",
      schema: [{ key: "toA", label: "To A", type: "relation", relationTarget: "cat-a", relationMode: "view", relationViewSlug: "view-a" }],
      views: [{ id: "vb", name: "View B", slug: "view-b", template: "B:{% for r in collection.records %}{{ r.toA }}{% endfor %}", order: 0 }],
    });

    const recordA = await cms.collections.createRecord({ collectionId: catA.id, data: {} });
    const recordB = await cms.collections.createRecord({ collectionId: catB.id, data: { toA: [recordA.id] } });
    await cms.collections.updateRecord(catA.id, recordA.id, { toB: [recordB.id] });

    const page = await cms.pages.create({ area: "public", slug: "cycle", title: "cycle", status: "published", structure: [] });
    await cms.pageVersions.createVersion(page.id, {
      structure: [{ blockType: "collection", collectionSlug: "cat-a", collectionViewSlug: "view-a", filteredRecordIds: [recordA.id] } as never],
      publish: true,
    });

    const result = await cms.renderPage("public", "cycle");
    expect(result).not.toBeNull();
    // A renders, embeds B, B embeds A again — the second A is blocked (empty), not re-rendered.
    expect(result).toContain("A:B:");
    expect((result!.match(/A:/g) ?? []).length).toBe(1);
  });
});
