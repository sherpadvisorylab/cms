import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [component, version] = await Promise.all([
    cms.components.findById(id),
    cms.componentVersions.getLatest(id),
  ]);

  if (!component) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id:             component.id,
    name:           component.name,
    namespace:      component.namespace ?? null,
    componentType:  component.type ?? "page",
    status:         component.status,
    previewImageUrl: component.previewImageUrl ?? "",
    templateLiquid: version?.templateLiquid ?? "",
    schemaJson:     version?.schema ?? [],
    css:            version?.css ?? "",
    js:             version?.js ?? "",
    version:        version?.version ?? 0,
  });
}
