import { cms } from "@/lib/cms";
import { notFound } from "next/navigation";
import { BackLink, FormCard, Field, SubmitRow, DeleteButton } from "@/components/admin/ui";
import { updateForm, deleteForm } from "../actions";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await cms.forms.findById(id);
  if (!form) notFound();

  const update = updateForm.bind(null, id);

  return (
    <div>
      <BackLink href="/admin/forms" label="Forms" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Form</h1>
        <DeleteButton action={deleteForm.bind(null, id)} />
      </div>
      <form action={update}>
        <FormCard>
          <Field label="Name" name="name" defaultValue={form.name} required />
          <Field label="Variable" name="variable" defaultValue={form.variable} required hint={`Embed: {{form:${form.variable}}}`} />
          <SubmitRow cancelHref="/admin/forms" />
        </FormCard>
      </form>
    </div>
  );
}
