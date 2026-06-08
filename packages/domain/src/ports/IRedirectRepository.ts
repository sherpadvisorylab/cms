import type { CmsRedirect } from "../entities/Redirect";

export interface IRedirectRepository {
  findAll(): Promise<CmsRedirect[]>;
  findById(id: string): Promise<CmsRedirect | null>;
  create(data: Omit<CmsRedirect, "id" | "createdAt" | "updatedAt">): Promise<CmsRedirect>;
  update(id: string, data: Partial<Omit<CmsRedirect, "id" | "createdAt">>): Promise<CmsRedirect>;
  delete(id: string): Promise<void>;
}
