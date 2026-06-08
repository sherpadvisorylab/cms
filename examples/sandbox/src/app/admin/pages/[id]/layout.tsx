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
  const pages = await cms.pages.findAll();
  const page = pages.find((entry) => entry.id === id);
  const pageTitle = page?.title?.trim() || "Page";

  return buildAdminEntityFrameMetadata(
    pageTitle,
    "📄",
    `Manage the page "${pageTitle}" across settings, content, and structure views.`,
  );
}

// Layout is intentionally minimal - each child page renders its own
// PageEditorHeader (sticky top bar + tabs) so it can include page-specific
// action buttons alongside the back link.
export default function PageLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
