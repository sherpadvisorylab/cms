"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";

export async function saveBranding(formData: FormData) {
  const existing = await cms.settings.get();
  await cms.settings.save({
    id: "global",
    ...(existing ?? {}),
    branding: {
      ...(existing?.branding ?? {}),
      projectName:      formData.get("projectName") as string || undefined,
      defaultLanguage:  formData.get("defaultLanguage") as string || undefined,
      defaultTimezone:  formData.get("defaultTimezone") as string || undefined,
      logoLight:        formData.get("logoLight") as string || undefined,
      logoDark:         formData.get("logoDark") as string || undefined,
      favicon:          formData.get("favicon") as string || undefined,
      defaultFont:      formData.get("defaultFont") as string || undefined,
      defaultIconFont:  formData.get("defaultIconFont") as string || undefined,
    },
    emailDefaults: {
      senderName:  formData.get("senderName") as string || undefined,
      senderEmail: formData.get("senderEmail") as string || undefined,
    },
  });
  revalidatePath("/admin/settings");
}

export async function saveAuthentication(formData: FormData) {
  const existing = await cms.settings.get();
  await cms.settings.save({
    id: "global",
    ...(existing ?? {}),
    authentication: {
      ssoEnabled: formData.get("ssoEnabled") === "on",
    },
  });
  revalidatePath("/admin/settings");
}

export async function saveSystemVars(data: {
  defaults: Record<string, string>;
  customKeys: string[];
}) {
  const existing = await cms.settings.get();
  await cms.settings.save({
    id: "global",
    ...(existing ?? {}),
    systemVariableDefaults: data.defaults,
    customVariableKeys: data.customKeys,
  });
  revalidatePath("/admin/settings");
}
