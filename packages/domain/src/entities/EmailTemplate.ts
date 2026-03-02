export interface EmailTemplate {
  id: string;
  templateKey: string;
  name: string;
  description?: string;
  subject: string;
  body: string;
  variables: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}
