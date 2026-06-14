"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CmsAreaStyle, CmsAreaDesign, CmsAreaLegal, CmsAreaTracking, CmsAreaAccessPolicy } from "@sherpacms/domain";

export async function createArea(formData: FormData) {
  await cms.areas.create({
    name: formData.get("name") as string,
    displayName: formData.get("displayName") as string,
    description: formData.get("description") as string || undefined,
    siteName: formData.get("siteName") as string || undefined,
    rootPath: formData.get("rootPath") as string || "/",
    status: (formData.get("status") as "active" | "inactive") || "active",
  });
  revalidatePath("/admin/areas");
  redirect("/admin/areas");
}

export async function updateArea(id: string, formData: FormData) {
  await cms.areas.update(id, {
    name: formData.get("name") as string,
    displayName: formData.get("displayName") as string,
    description: formData.get("description") as string || undefined,
    siteName: formData.get("siteName") as string || undefined,
    rootPath: formData.get("rootPath") as string || "/",
    status: (formData.get("status") as "active" | "inactive") || "active",
  });
  revalidatePath("/admin/areas");
  redirect("/admin/areas");
}

export async function deleteArea(id: string) {
  await cms.areas.delete(id);
  revalidatePath("/admin/areas");
}

// ── Full area save (all 7 tabs) ────────────────────────────────────────────────
export async function saveAreaFull(id: string, data: {
  displayName:      string;
  siteName:         string;
  rootPath:         string;
  description:      string;
  status:           "active" | "inactive";
  style:            CmsAreaStyle;
  design:           CmsAreaDesign;
  legal:            CmsAreaLegal;
  tracking:         CmsAreaTracking;
  accessPolicy:     CmsAreaAccessPolicy;
  defaultLocale?:   string;
  supportedLocales?: string[];
}) {
  await cms.areas.update(id, {
    displayName:      data.displayName  || undefined,
    siteName:         data.siteName     || undefined,
    rootPath:         data.rootPath     || "/",
    description:      data.description  || undefined,
    status:           data.status,
    style:            data.style,
    design:           data.design,
    legal:            data.legal,
    tracking:         data.tracking,
    accessPolicy:     data.accessPolicy,
    defaultLocale:    data.defaultLocale   || undefined,
    supportedLocales: data.supportedLocales?.length ? data.supportedLocales : undefined,
  });
  revalidatePath("/admin/areas");
}
