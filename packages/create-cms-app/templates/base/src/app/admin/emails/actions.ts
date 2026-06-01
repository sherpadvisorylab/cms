"use server";

import { cms } from "@/lib/cms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEmailTemplate(formData: FormData) {
  await cms.emailTemplates.create({
    templateKey: formData.get("templateKey") as string,
    name: formData.get("name") as string,
    description: formData.get("description") as string || undefined,
    subject: formData.get("subject") as string,
    body: formData.get("body") as string,
    variables: [],
    isSystem: false,
  });
  revalidatePath("/admin/emails");
  redirect("/admin/emails");
}

export async function updateEmailTemplate(id: string, formData: FormData) {
  // EmailTemplateRepository.update() only accepts subject + body by interface contract.
  // name/description are updated via the adapter directly through a type cast.
  await (cms.emailTemplates as any).update(id, {
    name: formData.get("name") as string,
    description: formData.get("description") as string || undefined,
    subject: formData.get("subject") as string,
    body: formData.get("body") as string,
  });
  revalidatePath("/admin/emails");
  redirect("/admin/emails");
}

export async function deleteEmailTemplate(id: string) {
  await (cms.emailTemplates as unknown as { delete(id: string): Promise<void> }).delete(id);
  revalidatePath("/admin/emails");
}
