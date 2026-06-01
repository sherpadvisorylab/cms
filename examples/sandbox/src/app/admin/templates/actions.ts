"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";

export async function createLayoutTemplate(data: {
  name: string;
  description?: string;
  type: "head" | "body";
  html: string;
}) {
  const t = await cms.layoutTemplates.create(data);
  revalidatePath("/admin/templates");
  return t;
}

export async function updateLayoutTemplate(id: string, data: {
  name?: string;
  description?: string;
  html?: string;
}) {
  const t = await cms.layoutTemplates.update(id, data);
  revalidatePath("/admin/templates");
  return t;
}

export async function deleteLayoutTemplate(id: string) {
  await cms.layoutTemplates.delete(id);
  revalidatePath("/admin/templates");
}
