import { BackLink, FormCard, Field, SelectField, SubmitRow } from "@/components/admin/ui";
import { createUser } from "../actions";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "New User",
  "Create a new CMS user account and assign role and status.",
);

export default function NewUserPage() {
  return (
    <div>
      <BackLink href="/admin/users" label="Users" />
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New User</h1>
      <form action={createUser}>
        <FormCard>
          <Field label="Name" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field
            label="Initial Password"
            name="password"
            type="password"
            required
            hint="The user can change it after first login"
          />
          <Field label="Company" name="company" />
          <SelectField label="Role" name="role" defaultValue="editor" options={[
            { value: "admin",  label: "Admin — full access" },
            { value: "editor", label: "Editor — create and edit content" },
            { value: "viewer", label: "Viewer — read only" },
          ]} />
          <SelectField label="Status" name="status" defaultValue="active" options={[
            { value: "active",   label: "Active" },
            { value: "invited",  label: "Invited" },
            { value: "inactive", label: "Inactive" },
          ]} />
          <SubmitRow cancelHref="/admin/users" />
        </FormCard>
      </form>
    </div>
  );
}
