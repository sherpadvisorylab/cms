import { cms } from "@/lib/cms";
import NewPageClient from "./NewPageClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewPagePage({ searchParams }: { searchParams: SearchParams }) {
  const [areas, pages, params] = await Promise.all([
    cms.areas.findAll(),
    cms.pages.findAll(),
    searchParams,
  ]);

  // Exclude system pages (e.g. 404) and archived pages from the parent list
  const systemPageIds = new Set(
    areas.flatMap((area) => Object.values(area.systemPages ?? {})),
  );
  const selectablePages = pages.filter(
    (p) => !systemPageIds.has(p.id) && p.status !== "archived",
  );

  const templateParam = params.template;
  const templateId = Array.isArray(templateParam) ? templateParam[0] ?? null : templateParam ?? null;

  return <NewPageClient areas={areas} pages={selectablePages} templateId={templateId} />;
}
