import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "../adapters/InMemoryAdapter";
import { SettingsRepository } from "../repositories/SettingsRepository";

describe("SettingsRepository", () => {
  let adapter: InMemoryAdapter;
  let repo: SettingsRepository;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    repo = new SettingsRepository(adapter);
  });

  it("returns null when no settings exist", async () => {
    const settings = await repo.get();
    expect(settings).toBeNull();
  });

  it("saves and retrieves settings", async () => {
    await repo.save({
      id: "global",
      branding: { projectName: "My Project" },
      authentication: { ssoEnabled: false },
    });

    const settings = await repo.get();
    expect(settings).not.toBeNull();
    expect(settings!.branding!.projectName).toBe("My Project");
    expect(settings!.authentication!.ssoEnabled).toBe(false);
  });

  it("save overwrites existing settings", async () => {
    await repo.save({ id: "global", branding: { projectName: "V1" } });
    await repo.save({ id: "global", branding: { projectName: "V2" } });

    const settings = await repo.get();
    expect(settings!.branding!.projectName).toBe("V2");
  });

  it("update partially updates settings", async () => {
    await repo.save({
      id: "global",
      branding: { projectName: "My Project" },
      authentication: { ssoEnabled: false },
    });

    await repo.update({ authentication: { ssoEnabled: true } });

    const settings = await repo.get();
    expect(settings!.authentication!.ssoEnabled).toBe(true);
  });

  it("update creates settings if none exist", async () => {
    await repo.update({ branding: { projectName: "New" } });
    const settings = await repo.get();
    expect(settings).not.toBeNull();
    expect(settings!.branding!.projectName).toBe("New");
  });
});
