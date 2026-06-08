import { cms } from "@/lib/cms";
import { buildAdminEntityMetadata } from "@/lib/adminMetadata";
import { notFound } from "next/navigation";
import { BackLink, FormCard, Field, TextareaField, SubmitRow, DeleteButton } from "@/components/admin/ui";
import { updateEmailTemplate, deleteEmailTemplate } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const templates = await cms.emailTemplates.findAll();
  const template = templates.find((entry) => entry.id === id);

  return buildAdminEntityMetadata(
    "Email Template",
    template?.name ?? null,
    "Edit the selected email template, its subject, and HTML body content.",
  );
}

export default async function EditEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const templates = await cms.emailTemplates.findAll();
  const template = templates.find((t) => t.id === id);
  if (!template) notFound();

  const update = updateEmailTemplate.bind(null, id);

  return (
    <div>
      <BackLink href="/admin/templates?tab=email" label="Templates" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Email Template</h1>
        <DeleteButton action={deleteEmailTemplate.bind(null, id)} />
      </div>
      <form action={update}>
        <FormCard>
          <Field label="Name" name="name" defaultValue={template.name} required />
          <Field label="Description" name="description" defaultValue={template.description ?? ""} />
          <Field label="Subject" name="subject" defaultValue={template.subject} required />
          <TextareaField label="Body (HTML + Liquid)" name="body" defaultValue={template.body} rows={12} mono />
          <SubmitRow cancelHref="/admin/emails" />
        </FormCard>
      </form>
    </div>
  );
}
