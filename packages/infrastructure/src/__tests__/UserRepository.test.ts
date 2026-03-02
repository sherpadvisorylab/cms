import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "../adapters/InMemoryAdapter";
import { UserRepository } from "../repositories/UserRepository";

describe("UserRepository", () => {
  let adapter: InMemoryAdapter;
  let repo: UserRepository;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    repo = new UserRepository(adapter);
  });

  it("creates a user and finds it by id", async () => {
    const user = await repo.create({
      name: "Alice",
      email: "alice@example.com",
      role: "admin",
      status: "active",
    });

    const found = await repo.findById(user.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Alice");
    expect(found!.role).toBe("admin");
  });

  it("finds a user by email", async () => {
    await repo.create({
      name: "Bob",
      email: "bob@example.com",
      role: "editor",
      status: "active",
    });

    const found = await repo.findByEmail("bob@example.com");
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Bob");
  });

  it("returns null for non-existent email", async () => {
    const found = await repo.findByEmail("nobody@example.com");
    expect(found).toBeNull();
  });

  it("findAll returns all users", async () => {
    await repo.create({ name: "A", email: "a@test.com", role: "admin", status: "active" });
    await repo.create({ name: "B", email: "b@test.com", role: "member", status: "active" });

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it("updates a user", async () => {
    const user = await repo.create({
      name: "Charlie",
      email: "charlie@test.com",
      role: "contributor",
      status: "active",
    });

    const updated = await repo.update(user.id, { status: "suspended" });
    expect(updated.status).toBe("suspended");
  });

  it("deletes a user", async () => {
    const user = await repo.create({
      name: "Delete Me",
      email: "delete@test.com",
      role: "member",
      status: "active",
    });

    await repo.delete(user.id);
    const found = await repo.findById(user.id);
    expect(found).toBeNull();
  });

  it("stores company for member role", async () => {
    const user = await repo.create({
      name: "Member User",
      email: "member@test.com",
      role: "member",
      status: "active",
      company: "Acme Corp",
    });

    const found = await repo.findById(user.id);
    expect(found!.company).toBe("Acme Corp");
  });
});
