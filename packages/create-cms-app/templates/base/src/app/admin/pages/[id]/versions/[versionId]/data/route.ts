import { NextResponse } from "next/server";
import { cms } from "@/lib/cms";

type PageVersionRecord = {
  id: string;
  pageId: string;
  version: number;
  structure: unknown[];
  publishedAt: string | Date | null;
  createdAt: string | Date;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;

  const adapter = (cms.pageVersions as unknown as {
    adapter?: {
      getAll<T>(collection: string, filter?: Partial<Record<string, unknown>>): Promise<T[]>;
    };
  }).adapter;

  if (!adapter) {
    return NextResponse.json({ error: "Version storage unavailable" }, { status: 500 });
  }

  const versions = await adapter.getAll<PageVersionRecord>("pageVersions", { pageId: id });
  const version = versions.find((entry) => entry.id === versionId) ?? null;

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: version.id,
    version: version.version,
    structure: version.structure ?? [],
    createdAt: version.createdAt,
    publishedAt: version.publishedAt ?? null,
  });
}
