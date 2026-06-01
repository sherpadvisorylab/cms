"use server";

import { cms } from "@/lib/cms";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createUser(formData: FormData) {
  const email    = formData.get("email") as string;
  const name     = formData.get("name") as string;
  const password = formData.get("password") as string;
  const role     = (formData.get("role") as "admin" | "editor" | "viewer") || "editor";
  const status   = (formData.get("status") as "active" | "inactive" | "invited") || "active";
  const company  = (formData.get("company") as string) || undefined;

  const supabaseAdmin = createAdminClient();

  // 1. Create in Supabase Auth
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (error) {
    throw new Error(`Supabase Auth error: ${error.message}`);
  }

  // 2. Create profile in cms_users
  await cms.users.create({ name, email, role, status, company });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(id: string, formData: FormData) {
  const role    = (formData.get("role") as "admin" | "editor" | "viewer") || "editor";
  const status  = (formData.get("status") as "active" | "inactive" | "invited") || "active";
  const company = (formData.get("company") as string) || undefined;

  // Update CMS profile
  await cms.users.update(id, {
    name: formData.get("name") as string,
    role,
    status,
    company,
  });

  // Sync role to Supabase Auth user_metadata
  const users = await cms.users.findAll();
  const user = users.find((u) => u.id === id);
  if (user) {
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = data.users.find((u) => u.email === user.email);
    if (authUser) {
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: { name: user.name, role },
      });
    }
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUser(id: string) {
  const users = await cms.users.findAll();
  const user = users.find((u) => u.id === id);

  if (user) {
    // Remove from Supabase Auth first
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = data.users.find((u) => u.email === user.email);
    if (authUser) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.id);
    }
  }

  // Remove from cms_users
  await cms.users.delete(id);
  revalidatePath("/admin/users");
}
