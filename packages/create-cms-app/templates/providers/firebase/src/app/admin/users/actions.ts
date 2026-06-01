"use server";

import { cms } from "@/lib/cms";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

initAdmin();

export async function createUser(formData: FormData) {
  const email    = formData.get("email") as string;
  const name     = formData.get("name") as string;
  const password = formData.get("password") as string;
  const role     = (formData.get("role") as string) || "editor";
  const status   = (formData.get("status") as "active" | "inactive" | "suspended") || "active";
  const company  = (formData.get("company") as string) || undefined;

  // Create in Firebase Auth
  const fbUser = await getAuth().createUser({ email, password, displayName: name });
  await getAuth().setCustomUserClaims(fbUser.uid, { role });

  // Create profile in CMS
  await cms.users.create({ name, email, role, status, company });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(id: string, formData: FormData) {
  const role    = (formData.get("role") as string) || "editor";
  const status  = (formData.get("status") as "active" | "inactive" | "suspended") || "active";
  const company = (formData.get("company") as string) || undefined;

  await cms.users.update(id, {
    name: formData.get("name") as string,
    role,
    status,
    company,
  });

  // Sync role claim to Firebase Auth
  const users = await cms.users.findAll();
  const user  = users.find((u) => u.id === id);
  if (user) {
    const fbUsers = await getAuth().getUserByEmail(user.email).catch(() => null);
    if (fbUsers) await getAuth().setCustomUserClaims(fbUsers.uid, { role });
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUser(id: string) {
  const users = await cms.users.findAll();
  const user  = users.find((u) => u.id === id);

  if (user) {
    const fbUser = await getAuth().getUserByEmail(user.email).catch(() => null);
    if (fbUser) await getAuth().deleteUser(fbUser.uid);
  }

  await cms.users.delete(id);
  revalidatePath("/admin/users");
}
