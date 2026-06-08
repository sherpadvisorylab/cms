import { cms } from "@/lib/cms";
import { ComponentsBrowser, type ComponentRow } from "./ComponentsBrowser";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Components",
  "Manage reusable page and UI components available to content editors.",
);

export default async function ComponentsPage() {
  const components = await cms.components.findAll();

  const rows: ComponentRow[] = components.map((c) => ({
    id: c.id,
    name: c.name,
    namespace: c.namespace ?? null,
    category: c.category ?? null,
    type: (c.type ?? "page") as ComponentRow["type"],
    status: c.status as ComponentRow["status"],
  }));

  return (
    <div>
      <ComponentsBrowser components={rows} />
    </div>
  );
}
