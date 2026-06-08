import type { ReactNode } from "react";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Structure",
  "Manage the component order and structural composition of the current page.",
);

export default function PageStructureLayout({ children }: { children: ReactNode }) {
  return children;
}
