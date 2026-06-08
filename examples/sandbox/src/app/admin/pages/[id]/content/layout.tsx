import type { ReactNode } from "react";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Content",
  "Edit component field values, rich text content, and preview the current page draft.",
);

export default function PageContentLayout({ children }: { children: ReactNode }) {
  return children;
}
