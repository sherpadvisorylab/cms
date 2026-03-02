import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "../adapters/InMemoryAdapter";

describe("InMemoryAdapter", () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  it("creates and retrieves a record by id", async () => {
    const record = { id: "abc-123", name: "Test" };
    await adapter.create("items", record);
    const found = await adapter.getById<typeof record>("items", "abc-123");
    expect(found).toEqual(record);
  });

  it("returns null for missing id", async () => {
    const found = await adapter.getById("items", "nonexistent");
    expect(found).toBeNull();
  });

  it("getAll returns all records in collection", async () => {
    await adapter.create("items", { id: "1", type: "a" });
    await adapter.create("items", { id: "2", type: "b" });
    const all = await adapter.getAll("items");
    expect(all).toHaveLength(2);
  });

  it("getAll filters by partial match", async () => {
    await adapter.create("items", { id: "1", type: "a", status: "active" });
    await adapter.create("items", { id: "2", type: "b", status: "active" });
    await adapter.create("items", { id: "3", type: "a", status: "draft" });

    const results = await adapter.getAll("items", { type: "a", status: "active" });
    expect(results).toHaveLength(1);
    expect((results[0] as { id: string }).id).toBe("1");
  });

  it("updates a record", async () => {
    await adapter.create("items", { id: "x", value: 1 });
    const updated = await adapter.update<{ id: string; value: number }>("items", "x", { value: 2 });
    expect(updated.value).toBe(2);
  });

  it("throws when updating nonexistent record", async () => {
    await expect(adapter.update<{ id: string; value: number }>("items", "ghost", { value: 1 })).rejects.toThrow();
  });

  it("deletes a record", async () => {
    await adapter.create("items", { id: "del-me", value: 1 });
    await adapter.delete("items", "del-me");
    const found = await adapter.getById("items", "del-me");
    expect(found).toBeNull();
  });

  it("reset clears all data", async () => {
    await adapter.create("items", { id: "1", value: 1 });
    adapter.reset();
    const all = await adapter.getAll("items");
    expect(all).toHaveLength(0);
  });

  it("isolates different collections", async () => {
    await adapter.create("pages", { id: "p1", title: "Page" });
    await adapter.create("menus", { id: "m1", label: "Menu" });

    const pages = await adapter.getAll("pages");
    const menus = await adapter.getAll("menus");
    expect(pages).toHaveLength(1);
    expect(menus).toHaveLength(1);
  });
});
