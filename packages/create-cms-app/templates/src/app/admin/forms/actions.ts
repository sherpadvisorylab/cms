"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createForm(formData: FormData) {
  await cms.forms.create({
    name: formData.get("name") as string,
    variable: formData.get("variable") as string,
    schema: { groups: [] },
  });
  revalidatePath("/admin/forms");
  redirect("/admin/forms");
}

export async function updateForm(id: string, formData: FormData) {
  await cms.forms.update(id, {
    name: formData.get("name") as string,
    variable: formData.get("variable") as string,
  });
  revalidatePath("/admin/forms");
  redirect("/admin/forms");
}

export async function deleteForm(id: string) {
  await cms.forms.delete(id);
  revalidatePath("/admin/forms");
}
