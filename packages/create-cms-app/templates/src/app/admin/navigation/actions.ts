"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CmsNavigationItem } from "@cms/domain";

export async function createNavigation(formData: FormData) {
  await cms.navigations.create({
    name: formData.get("name") as string,
    slug: formData.get("slug") as string || "",
    items: [],
    template: formData.get("template") as string || "",
    additionalCss: formData.get("additionalCss") as string || "",
    additionalJs: formData.get("additionalJs") as string || "",
  });
  revalidatePath("/admin/navigation");
  redirect("/admin/navigation");
}

export async function createNavigationDirect(name: string) {
  const nav = await cms.navigations.create({
    name,
    items: [],
    template: "",
    additionalCss: "",
    additionalJs: "",
  });
  revalidatePath("/admin/navigation");
  return nav;
}

export async function updateNavigation(id: string, formData: FormData) {
  await cms.navigations.update(id, {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string || "",
    template: formData.get("template") as string || "",
    additionalCss: formData.get("additionalCss") as string || "",
    additionalJs: formData.get("additionalJs") as string || "",
  });
  revalidatePath("/admin/navigation");
  redirect("/admin/navigation");
}

export async function saveNavigationFull(id: string, data: {
  name: string;
  slug: string;
  items: CmsNavigationItem[];
  template: string;
  additionalCss: string;
  additionalJs: string;
}) {
  await cms.navigations.update(id, data);
  revalidatePath("/admin/navigation");
}

export async function deleteNavigation(id: string) {
  await cms.navigations.delete(id);
  revalidatePath("/admin/navigation");
}
