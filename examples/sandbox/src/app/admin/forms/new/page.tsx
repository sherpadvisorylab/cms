import { BackLink, FormCard, Field, SubmitRow } from "@/components/admin/ui";
import { createForm } from "../actions";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "New Form",
  "Create a new reusable form and assign its embed variable.",
);

export default function NewFormPage() {
  return (
    <div>
      <BackLink href="/admin/forms" label="Forms" />
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Form</h1>
      <form action={createForm}>
        <FormCard>
          <Field label="Name" name="name" required />
          <Field label="Variable" name="variable" required hint="Used to embed the form: {{form:variable}}" />
          <SubmitRow cancelHref="/admin/forms" />
        </FormCard>
      </form>
    </div>
  );
}
