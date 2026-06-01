"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createComponent(formData: FormData) {
  const name      = formData.get("name") as string;
  const namespace = (formData.get("namespace") as string) || undefined;
  const type      = ((formData.get("componentType") as string) || "page") as "page" | "ui" | "navigation";

  const component = await cms.components.create({ name, namespace, type, status: "active" });

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
    name:      formData.get("name") as string,
    namespace: (formData.get("namespace") as string) || undefined,
    status:    ((formData.get("status") as string) || "active") as "active" | "inactive",
    type:      ((formData.get("componentType") as string) || "page") as "page" | "ui" | "navigation",
  });
  revalidatePath("/admin/components");
  redirect("/admin/components");
}

export async function quickUpdateComponent(id: string, data: {
  name: string;
  namespace: string | null;
  status: string;
  type: string;
}) {
  await cms.components.update(id, {
    name:      data.name,
    namespace: data.namespace ?? undefined,
    status:    data.status as "active" | "inactive",
    type:      data.type as "page" | "ui" | "navigation",
  });
  revalidatePath("/admin/components");
}

export async function deleteComponent(id: string) {
  await cms.components.delete(id);
  revalidatePath("/admin/components");
  redirect("/admin/components");
}

export async function createVersion(componentId: string, data: {
  templateLiquid: string;
  schemaJson: string;
  css: string;
  js: string;
}) {
  let schema: unknown[] = [];
  if (data.schemaJson.trim()) {
    try { schema = JSON.parse(data.schemaJson); } catch { throw new Error("Invalid schema JSON"); }
  }

  await cms.componentVersions.createVersion(componentId, {
    templateLiquid: data.templateLiquid,
    schema: schema as never,
    css:    data.css || undefined,
    js:     data.js  || undefined,
  });
}
