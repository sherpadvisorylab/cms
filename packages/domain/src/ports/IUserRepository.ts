import type { CmsUser } from "../entities/User";

export interface IUserRepository {
  findAll(): Promise<CmsUser[]>;
  findById(id: string): Promise<CmsUser | null>;
  findByEmail(email: string): Promise<CmsUser | null>;
  create(user: Omit<CmsUser, "id">): Promise<CmsUser>;
  update(id: string, updates: Partial<CmsUser>): Promise<CmsUser>;
  delete(id: string): Promise<void>;
}
