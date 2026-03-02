import type { ComponentInstance } from "./Page";

export interface CmsTemplate {
  id: string;
  name: string;
  description?: string;
  structure: ComponentInstance[];
  createdAt: Date;
}
