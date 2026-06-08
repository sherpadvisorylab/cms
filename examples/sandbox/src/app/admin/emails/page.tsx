import { cms } from "@/lib/cms";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Emails",
  "Manage reusable email templates and default messaging content.",
);

export default async function EmailsPage() {
  const templates = await cms.emailTemplates.findAll();

  return (
    <div>
      <AdminPageHeader
        title="Email Templates"
        actions={<Link href="/admin/emails/new" className="btn btn-primary">+ New Template</Link>}
      />

      {templates.length === 0 ? (
        <div className="empty-state"><p>No email templates yet.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Subject</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>
                    <code style={{ fontSize: "0.78rem", background: "#f1f5f9",
                      padding: "2px 6px", borderRadius: 4, color: "var(--text-muted)" }}>
                      {t.templateKey}
                    </code>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{t.subject || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/admin/emails/${t.id}`} className="btn btn-secondary btn-sm">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
