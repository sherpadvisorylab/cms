"use server";

import { cms } from "@/lib/cms";
import { revalidatePath, revalidateTag } from "next/cache";
import type { CmsTranslationEntry } from "@sherpacms/domain";

/** {{t.key}} is resolved in every Liquid render, so a dictionary change can affect any cached page. */
function revalidatePublicPages() {
  revalidateTag("pages");
  revalidateTag("home-page");
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createTranslationEntry(data: {
  key: string;
  description?: string;
  values: Record<string, string>;
}) {
  const key = normalizeKey(data.key);
  if (!key) throw new Error("A translation key is required.");

  const existing = await cms.translations.findByKey(key);
  if (existing) throw new Error(`Translation key "${key}" already exists.`);

  const entry = await cms.translations.create({
    key,
    description: data.description?.trim() || undefined,
    values: data.values,
  });
  revalidatePath("/admin/translations");
  revalidatePublicPages();
  return entry;
}

export async function updateTranslationEntry(
  id: string,
  updates: Partial<Omit<CmsTranslationEntry, "id">>,
) {
  const entry = await cms.translations.update(id, updates);
  revalidatePath("/admin/translations");
  revalidatePublicPages();
  return entry;
}

export async function deleteTranslationEntry(id: string) {
  await cms.translations.delete(id);
  revalidatePath("/admin/translations");
  revalidatePublicPages();
}
