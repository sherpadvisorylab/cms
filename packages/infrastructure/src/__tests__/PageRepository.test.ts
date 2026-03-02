import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "../adapters/InMemoryAdapter";
import { PageRepository, PageVersionRepository } from "../repositories/PageRepository";

describe("PageRepository", () => {
  let adapter: InMemoryAdapter;
  let repo: PageRepository;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    repo = new PageRepository(adapter);
  });

  it("creates a page and finds it by slug", async () => {
    await repo.create({
      area: "public",
      slug: "home",
      title: "Home Page",
      status: "published",
      structure: [],
    });

    const found = await repo.findBySlug("public", "home");
    expect(found).not.toBeNull();
    expect(found!.title).toBe("Home Page");
  });

  it("returns null for unpublished pages", async () => {
    await repo.create({
      area: "public",
      slug: "draft-page",
      title: "Draft",
      status: "draft",
      structure: [],
    });

    const found = await repo.findBySlug("public", "draft-page");
    expect(found).toBeNull();
  });

  it("findAll returns pages filtered by area", async () => {
    await repo.create({ area: "public", slug: "p1", title: "P1", status: "published", structure: [] });
    await repo.create({ area: "admin", slug: "a1", title: "A1", status: "published", structure: [] });

    const publicPages = await repo.findAll("public");
    expect(publicPages).toHaveLength(1);
    expect(publicPages[0].slug).toBe("p1");
  });

  it("updates a page", async () => {
    const page = await repo.create({ area: "public", slug: "about", title: "About", status: "draft", structure: [] });
    const updated = await repo.update(page.id, { status: "published" });
    expect(updated.status).toBe("published");
  });

  it("deletes a page", async () => {
    const page = await repo.create({ area: "public", slug: "delete-me", title: "Delete", status: "published", structure: [] });
    await repo.delete(page.id);
    const found = await repo.findBySlug("public", "delete-me");
    expect(found).toBeNull();
  });
});

describe("PageVersionRepository", () => {
  let adapter: InMemoryAdapter;
  let pageRepo: PageRepository;
  let versionRepo: PageVersionRepository;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    pageRepo = new PageRepository(adapter);
    versionRepo = new PageVersionRepository(adapter);
  });

  it("creates a version and retrieves the latest published", async () => {
    const page = await pageRepo.create({ area: "public", slug: "home", title: "Home", status: "published", structure: [] });

    await versionRepo.createVersion(page.id, {
      structure: [{ componentId: "comp-1", props: { heading: "Hello" } }],
      publish: true,
    });

    const latest = await versionRepo.getLatestPublished(page.id);
    expect(latest).not.toBeNull();
    expect(latest!.version).toBe(1);
    expect(latest!.publishedAt).not.toBeNull();
  });

  it("auto-increments version numbers", async () => {
    const page = await pageRepo.create({ area: "public", slug: "home", title: "Home", status: "published", structure: [] });

    await versionRepo.createVersion(page.id, { structure: [], publish: true });
    await versionRepo.createVersion(page.id, { structure: [], publish: true });
    const v3 = await versionRepo.createVersion(page.id, { structure: [], publish: true });

    expect(v3.version).toBe(3);
  });

  it("getLatestPublished returns null for unpublished versions", async () => {
    const page = await pageRepo.create({ area: "public", slug: "home", title: "Home", status: "published", structure: [] });
    await versionRepo.createVersion(page.id, { structure: [], publish: false });

    const latest = await versionRepo.getLatestPublished(page.id);
    expect(latest).toBeNull();
  });
});
