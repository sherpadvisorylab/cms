import { cms } from "@/lib/cms";
import NewPageClient from "./NewPageClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewPagePage({ searchParams }: { searchParams: SearchParams }) {
  const [areas, pages, params] = await Promise.all([
    cms.areas.findAll(),
    cms.pages.findAll(),
    searchParams,
  ]);

  const templateParam = params.template;
  const templateId = Array.isArray(templateParam) ? templateParam[0] ?? null : templateParam ?? null;

  return <NewPageClient areas={areas} pages={pages} templateId={templateId} />;
}
