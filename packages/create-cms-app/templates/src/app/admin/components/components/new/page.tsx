import { BackLink, FormCard, Field, SelectField, TextareaField, SubmitRow } from "@/components/admin/ui";
import { createComponent } from "../actions";

export default function NewComponentPage() {
  return (
    <div>
      <BackLink href="/admin/components" label="Components" />
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Component</h1>
      <form action={createComponent}>
        <FormCard>
          <Field label="Name" name="name" required />
          <Field label="Namespace" name="namespace" hint="Optional grouping prefix, e.g. 'marketing'" />
          <SelectField label="Type" name="type" defaultValue="page" options={[
            { value: "page", label: "Page" },
            { value: "ui", label: "UI" },
            { value: "navigation", label: "Navigation" },
          ]} />
          <Field label="Category" name="category" hint="e.g. Hero, CTA, Footer" />
          <Field label="Description" name="description" />
          <SelectField label="Status" name="status" defaultValue="active" options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]} />
          <TextareaField label="Liquid Template" name="templateLiquid" rows={8} mono hint="Liquid HTML template. Use {{ variable }} syntax." />
          <TextareaField label="CSS" name="css" rows={4} mono />
          <TextareaField label="JavaScript" name="js" rows={4} mono />
          <SubmitRow cancelHref="/admin/components" />
        </FormCard>
      </form>
    </div>
  );
}
