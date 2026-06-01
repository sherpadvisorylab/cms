import { BackLink, FormCard, Field, SelectField, SubmitRow } from "@/components/admin/ui";
import { createArea } from "../actions";

export default function NewAreaPage() {
  return (
    <div>
      <BackLink href="/admin/areas" label="Areas" />
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Area</h1>
      <form action={createArea}>
        <FormCard>
          <Field label="Name (key)" name="name" required hint="Unique identifier, e.g. 'public' or 'members'" />
          <Field label="Display Name" name="displayName" required />
          <Field label="Site Name" name="siteName" />
          <Field label="Root Path" name="rootPath" defaultValue="/" hint="URL prefix for this area, e.g. '/'" />
          <Field label="Description" name="description" />
          <SelectField
            label="Status"
            name="status"
            defaultValue="active"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <SubmitRow cancelHref="/admin/areas" />
        </FormCard>
      </form>
    </div>
  );
}
