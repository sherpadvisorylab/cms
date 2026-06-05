"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ComponentInstance } from "@sherpacms/domain";

async function revalidatePublishedPagesUsingComponent(componentId: string) {
  const pages = await cms.pages.findAll();
  const matchingSlugs = new Set<string>();

  await Promise.all(
    pages.map(async (page) => {
      if (page.status !== "published") return;

      const publishedVersion = await cms.pageVersions.getLatestPublished(page.id).catch(() => null);
      const structure = (publishedVersion?.structure ?? []) as ComponentInstance[];
      const usesComponent = structure.some((instance) => instance.componentId === componentId);

      if (usesComponent) {
        matchingSlugs.add(page.slug);
      }
    }),
  );

  if (matchingSlugs.size > 0) {
    await cms.revalidatePage([...matchingSlugs]);
  }
}

export async function createComponent(formData: FormData) {
  const name = formData.get("name") as string;
  const category = (formData.get("category") as string) || undefined;
  const type = ((formData.get("componentType") as string) || "page") as "page" | "ui";

  const component = await cms.components.create({ name, category, type, status: "draft" });

  // Create initial placeholder version
  await cms.componentVersions.createVersion(component.id, {
    templateLiquid: `<div class="${name.toLowerCase().replace(/\s+/g, "-")}">\n  <h2>{{ heading }}</h2>\n</div>`,
    schema: [{ key: "heading", label: "Heading", type: "text", defaultValue: "New Component" }],
    css: "",
    js: "",
  });

  redirect(`/admin/components/${component.id}`);
}

export async function updateComponent(id: string, formData: FormData) {
  await cms.components.update(id, {
    name: formData.get("name") as string,
    category: (formData.get("category") as string) || undefined,
    status: ((formData.get("status") as string) || "published") as "draft" | "published",
    type: ((formData.get("componentType") as string) || "page") as "page" | "ui",
  });
  revalidatePath("/admin/components");
  revalidatePath(`/admin/components/${id}`);
  redirect(`/admin/components/${id}`);
}

export async function quickUpdateComponent(id: string, data: {
  name: string;
  category: string | null;
  status: string;
  type: string;
}) {
  await cms.components.update(id, {
    name: data.name,
    category: data.category ?? undefined,
    status: data.status as "draft" | "published",
    type: data.type as "page" | "ui",
  });
  revalidatePath("/admin/components");
  revalidatePath(`/admin/components/${id}`);
}

export async function deleteComponent(id: string) {
  await cms.components.delete(id);
  revalidatePath("/admin/components");
  redirect("/admin/components");
}

export async function importComponent(payload: {
  name:              string;
  namespace?:        string;
  type:              "page" | "ui";
  category?:         string;
  description?:      string;
  status?:           "draft" | "published";
  templateLiquid:    string;
  schema:            unknown[];
  css:               string;
  js:                string;
  schemaOrgTemplate: string;
}) {
  const component = await cms.components.create({
    name:      payload.name,
    namespace: payload.namespace || undefined,
    type:      payload.type,
    category:  payload.category || undefined,
    description: payload.description || undefined,
    status:    payload.status ?? "draft",
  });
  await cms.componentVersions.createVersion(component.id, {
    templateLiquid:    payload.templateLiquid,
    schema:            payload.schema as never,
    css:               payload.css  || undefined,
    js:                payload.js   || undefined,
    schemaOrgTemplate: payload.schemaOrgTemplate || undefined,
  });
  revalidatePath("/admin/components");
  return component.id;
}

export async function createVersion(componentId: string, data: {
  templateLiquid:    string;
  schemaJson:        string;
  schemaOrgTemplate: string;
  css: string;
  js:  string;
}) {
  let schema: unknown[] = [];
  if (data.schemaJson.trim()) {
    try { schema = JSON.parse(data.schemaJson); } catch { throw new Error("Invalid schema JSON"); }
  }

  await cms.componentVersions.createVersion(componentId, {
    templateLiquid:    data.templateLiquid,
    schema:            schema as never,
    css:               data.css  || undefined,
    js:                data.js   || undefined,
    schemaOrgTemplate: data.schemaOrgTemplate || undefined,
  });

  await revalidatePublishedPagesUsingComponent(componentId);
}
