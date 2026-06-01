import { PageTabNav } from "./TabNav";
import Link from "next/link";

export default async function PageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      {/* Back + sub-tab nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
        <Link href="/admin/pages" style={{ fontSize: "0.85rem", color: "var(--text-muted)",
          textDecoration: "none" }}>
          ← Pages
        </Link>
      </div>
      <PageTabNav id={id} />
      {children}
    </div>
  );
}
