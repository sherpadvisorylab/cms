import type { ReactNode } from "react";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "New Page",
  "Create a new page, assign its area, and define the initial slug.",
);

export default function NewPageLayout({ children }: { children: ReactNode }) {
  return children;
}
