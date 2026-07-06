"use server";

import { cms } from "@/lib/cms";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { CmsNavigationItem } from "@sherpacms/domain";

/** Navigations can be embedded on any public page via {{navigation:id}}, so bust every cached page render. */
function revalidatePublicPages() {
  revalidateTag("pages");
  revalidateTag("home-page");
}

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
  revalidatePublicPages();
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
  revalidatePublicPages();
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
  revalidatePublicPages();
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
  revalidatePublicPages();
}

export async function deleteNavigation(id: string) {
  await cms.navigations.delete(id);
  revalidatePath("/admin/navigation");
  revalidatePublicPages();
}
