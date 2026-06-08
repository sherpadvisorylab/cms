import { cms } from "@/lib/cms";
import { buildAdminEntityMetadata } from "@/lib/adminMetadata";
import { notFound } from "next/navigation";
import { BackLink, FormCard, Field, SelectField, SubmitRow, DeleteButton } from "@/components/admin/ui";
import { updateUser, deleteUser } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await cms.users.findById(id);

  return buildAdminEntityMetadata(
    "User",
    user?.name ?? user?.email ?? null,
    "Edit user profile information, role, and account status.",
  );
}

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await cms.users.findById(id);
  if (!user) notFound();

  const update = updateUser.bind(null, id);

  return (
    <div>
      <BackLink href="/admin/users" label="Users" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit User</h1>
        <DeleteButton action={deleteUser.bind(null, id)} />
      </div>
      <form action={update}>
        <FormCard>
          <Field label="Name" name="name" defaultValue={user.name} required />
          <Field label="Email" name="email" type="email" defaultValue={user.email} required />
          <Field label="Company" name="company" defaultValue={user.company ?? ""} />
          <SelectField label="Role" name="role" defaultValue={user.role} options={[
            { value: "admin", label: "Admin" },
            { value: "editor", label: "Editor" },
            { value: "viewer", label: "Viewer" },
          ]} />
          <SelectField label="Status" name="status" defaultValue={user.status} options={[
            { value: "active", label: "Active" },
            { value: "invited", label: "Invited" },
            { value: "inactive", label: "Inactive" },
          ]} />
          <SubmitRow cancelHref="/admin/users" />
        </FormCard>
      </form>
    </div>
  );
}
