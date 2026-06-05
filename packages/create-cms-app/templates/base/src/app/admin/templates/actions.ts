"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";

export async function createTemplate(data: {
  name: string;
  description?: string;
  type: "area_head" | "area_body" | "navigation";
  html: string;
  css?: string | null;
  js?: string | null;
}) {
  const t = await cms.templates.create(data);
  revalidatePath("/admin/templates");
  return t;
}

export async function updateTemplate(id: string, data: {
  name?: string;
  description?: string;
  html?: string;
  css?: string | null;
  js?: string | null;
}) {
  const t = await cms.templates.update(id, data);
  revalidatePath("/admin/templates");
  return t;
}

export async function deleteTemplate(id: string) {
  await cms.templates.delete(id);
  revalidatePath("/admin/templates");
}
