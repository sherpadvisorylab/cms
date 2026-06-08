import { redirect } from "next/navigation";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Navigation",
  "Manage menus, navigation trees, and reusable navigation templates.",
);

// Navigation editing is now inline on /admin/navigation
export default function EditNavigationPage() {
  redirect("/admin/navigation");
}
