import { cms } from "@/lib/cms";
import { BackLink, FormCard, Field, SelectField, SubmitRow } from "@/components/admin/ui";
import { createPage } from "../actions";

export default async function NewPagePage() {
  const areas = await cms.areas.findAll();

  return (
    <div>
      <BackLink href="/admin/pages" label="Pages" />
      <h1 className="page-header" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 20 }}>
        New Page
      </h1>
      <form action={createPage}>
        <FormCard>
          <SelectField
            label="Area"
            name="area"
            options={areas.map((a) => ({ value: a.name, label: a.displayName || a.name }))}
          />
          <Field label="Title" name="title" required />
          <Field label="Slug" name="slug" required hint="URL path, e.g. 'about' or 'home'" />
          <SubmitRow cancelHref="/admin/pages" />
        </FormCard>
      </form>
    </div>
  );
}
