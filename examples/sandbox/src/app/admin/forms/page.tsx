import { cms } from "@/lib/cms";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default async function FormsPage() {
  const forms = await cms.forms.findAll();

  return (
    <div>
      <AdminPageHeader
        title="Forms"
        actions={<Link href="/admin/forms/new" className="btn btn-primary">+ New Form</Link>}
      />

      {forms.length === 0 ? (
        <div className="empty-state"><p>No forms yet.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Embed key</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td>
                    <code style={{ fontSize: "0.78rem", background: "#f1f5f9",
                      padding: "2px 6px", borderRadius: 4, color: "var(--primary)" }}>
                      {`{{form:${f.variable}}}`}
                    </code>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/admin/forms/${f.id}`} className="btn btn-secondary btn-sm">Edit</Link>
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
