import { BackLink, FormCard, Field, TextareaField, SubmitRow } from "@/components/admin/ui";
import { createEmailTemplate } from "../actions";

export default function NewEmailPage() {
  return (
    <div>
      <BackLink href="/admin/templates?tab=email" label="Templates" />
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Email Template</h1>
      <form action={createEmailTemplate}>
        <FormCard>
          <Field label="Template Key" name="templateKey" required hint="Unique identifier, e.g. 'welcome' or 'password-reset'" />
          <Field label="Name" name="name" required />
          <Field label="Description" name="description" />
          <Field label="Subject" name="subject" required />
          <TextareaField label="Body (HTML + Liquid)" name="body" rows={10} mono hint="Use {{ variable }} for dynamic values" />
          <SubmitRow cancelHref="/admin/emails" />
        </FormCard>
      </form>
    </div>
  );
}
