import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "../src/adapters/InMemoryAdapter";
import { PageRepository, PageVersionRepository } from "../src/repositories/PageRepository";

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

  it("findAll filters by locale when provided", async () => {
    await repo.create({ area: "public", slug: "home-it", title: "Home IT", status: "published", structure: [], locale: "it" });
    await repo.create({ area: "public", slug: "home-en", title: "Home EN", status: "published", structure: [], locale: "en" });

    const itPages = await repo.findAll("public", "it");
    expect(itPages).toHaveLength(1);
    expect(itPages[0].slug).toBe("home-it");

    const allPages = await repo.findAll("public");
    expect(allPages).toHaveLength(2);
  });

  it("findByLocale returns only pages of that locale for the area", async () => {
    await repo.create({ area: "public", slug: "about-it", title: "About IT", status: "published", structure: [], locale: "it" });
    await repo.create({ area: "public", slug: "about-en", title: "About EN", status: "draft", structure: [], locale: "en" });
    await repo.create({ area: "other", slug: "other-it", title: "Other IT", status: "published", structure: [], locale: "it" });

    const results = await repo.findByLocale("public", "it");
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("about-it");
  });

  it("findByTranslationKey returns all locale versions of the same logical page", async () => {
    const key = "shared-uuid-123";
    await repo.create({ area: "public", slug: "home-it", title: "Home IT", status: "published", structure: [], locale: "it", translationKey: key });
    await repo.create({ area: "public", slug: "home-en", title: "Home EN", status: "draft",     structure: [], locale: "en", translationKey: key });
    await repo.create({ area: "public", slug: "other",   title: "Other",   status: "published", structure: [], locale: "it", translationKey: "different-key" });

    const translations = await repo.findByTranslationKey(key);
    expect(translations).toHaveLength(2);
    expect(translations.map((p) => p.slug).sort()).toEqual(["home-en", "home-it"]);
  });

  it("findPublishedByTranslationKey returns only published translations", async () => {
    const key = "shared-uuid-456";
    await repo.create({ area: "public", slug: "home-it", title: "Home IT", status: "published", structure: [], locale: "it", translationKey: key });
    await repo.create({ area: "public", slug: "home-en", title: "Home EN", status: "draft",     structure: [], locale: "en", translationKey: key });
    await repo.create({ area: "public", slug: "home-fr", title: "Home FR", status: "published", structure: [], locale: "fr", translationKey: key });

    const published = await repo.findPublishedByTranslationKey(key);
    expect(published).toHaveLength(2);
    expect(published.map((p) => p.locale).sort()).toEqual(["fr", "it"]);
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
