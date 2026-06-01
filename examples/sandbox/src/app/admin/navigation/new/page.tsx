import { BackLink, FormCard, Field, TextareaField, SubmitRow } from "@/components/admin/ui";
import { createNavigation } from "../actions";

export default function NewNavigationPage() {
  return (
    <div>
      <BackLink href="/admin/navigation" label="Navigation" />
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Navigation Block</h1>
      <form action={createNavigation}>
        <FormCard>
          <Field label="Name" name="name" required />
          <TextareaField label="Liquid Template" name="template" rows={8} mono
            hint="Rendered via {{navigation:id}} in area templates. Use {% for item in items %}." />
          <TextareaField label="Additional CSS" name="additionalCss" rows={4} mono />
          <TextareaField label="Additional JS" name="additionalJs" rows={4} mono />
          <SubmitRow cancelHref="/admin/navigation" />
        </FormCard>
      </form>
    </div>
  );
}
