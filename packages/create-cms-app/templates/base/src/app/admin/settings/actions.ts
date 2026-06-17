"use server";

import { cms } from "@/lib/cms";
import { revalidatePath, revalidateTag } from "next/cache";
import type { CmsVariableDefinition, CmsLocaleEntry } from "@sherpacms/domain";

export async function saveBranding(formData: FormData) {
  const existing = await cms.settings.get();
  await cms.settings.save({
    id: "global",
    ...(existing ?? {}),
    branding: {
      ...(existing?.branding ?? {}),
      projectName:      formData.get("projectName") as string || undefined,
      siteUrl:          formData.get("siteUrl") as string || undefined,
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
  revalidateTag("favicon");
}

export async function saveSeo(formData: FormData) {
  const existing = await cms.settings.get();
  await cms.settings.save({
    id: "global",
    ...(existing ?? {}),
    seo: {
      ...(existing?.seo ?? {}),
      canonicalHost: formData.get("canonicalHost") as string || undefined,
      robotsTxt:     formData.get("robotsTxt") as string || undefined,
      llmsTxt:       formData.get("llmsTxt") as string || undefined,
    },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/robots.txt");
  revalidateTag("sitemap");
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

export async function saveLocalization(formData: FormData) {
  const multiLanguageEnabled = formData.get("multiLanguageEnabled") === "on";
  const locales: CmsLocaleEntry[] = JSON.parse((formData.get("locales") as string) || "[]");
  const defaultEntry = locales.find((l) => l.isDefault) ?? locales[0];

  const existing = await cms.settings.get();
  await cms.settings.save({
    id: "global",
    ...(existing ?? {}),
    branding: {
      ...(existing?.branding ?? {}),
      multiLanguageEnabled,
      locales,
      // Keep backward-compat fields in sync
      defaultLanguage: defaultEntry?.code ?? existing?.branding?.defaultLanguage,
      supportedLocales: locales.map((l) => l.code),
    },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/api/locale-config");
}

export async function saveSystemVars(data: {
  variables: CmsVariableDefinition[];
}) {
  const existing = await cms.settings.get();
  await cms.settings.save({
    id: "global",
    ...(existing ?? {}),
    variables: data.variables,
  });
  revalidatePath("/admin/settings");
}
