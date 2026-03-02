import type { CmsUser, IUserRepository } from "@cms/domain";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import { generateId } from "../utils/storage";

export class UserRepository implements IUserRepository {
  constructor(private adapter: StorageAdapter) {}

  async findAll(): Promise<CmsUser[]> {
    return this.adapter.getAll<CmsUser>("users");
  }

  async findById(id: string): Promise<CmsUser | null> {
    return this.adapter.getById<CmsUser>("users", id);
  }

  async findByEmail(email: string): Promise<CmsUser | null> {
    const users = await this.adapter.getAll<CmsUser>("users", { email });
    return users[0] ?? null;
  }

  async create(user: Omit<CmsUser, "id">): Promise<CmsUser> {
    const newUser: CmsUser = {
      ...user,
      id: generateId(),
    };
    return this.adapter.create("users", newUser);
  }

  async update(id: string, updates: Partial<CmsUser>): Promise<CmsUser> {
    return this.adapter.update<CmsUser>("users", id, updates);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete("users", id);
  }
}
