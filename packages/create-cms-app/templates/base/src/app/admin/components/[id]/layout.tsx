import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cms } from "@/lib/cms";
import { buildAdminEntityFrameMetadata } from "@/lib/adminMetadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const component = await cms.components.findById(id);
  const componentName = component?.name?.trim() || "Component";

  return buildAdminEntityFrameMetadata(
    componentName,
    "🧩",
    `Edit the component "${componentName}", its template, schema, styling, and behavior.`,
  );
}

export default function ComponentEditorLayout({ children }: { children: ReactNode }) {
  return children;
}
