import { cms } from "@/lib/cms";
import { ComponentsBrowser, type ComponentRow } from "./ComponentsBrowser";

export default async function ComponentsPage() {
  const components = await cms.components.findAll();

  const rows: ComponentRow[] = components.map((c) => ({
    id:        c.id,
    name:      c.name,
    namespace: c.namespace ?? null,
    type:      (c.type ?? "page") as ComponentRow["type"],
    status:    (c.status as ComponentRow["status"]),
  }));

  return (
    <div>
      <ComponentsBrowser components={rows} />
    </div>
  );
}
