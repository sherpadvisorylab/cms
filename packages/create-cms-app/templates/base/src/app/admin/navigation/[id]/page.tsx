import { redirect } from "next/navigation";

// Navigation editing is now inline on /admin/navigation
export default function EditNavigationPage() {
  redirect("/admin/navigation");
}
