import React from "react";
import { cms } from "@/lib/cms";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Areas",
  "Configure site areas, routing roots, design settings, and access rules.",
);

export default async function AreasPage() {
  const areas = await cms.areas.findAll();

  return (
    <div>
      <AdminPageHeader
        title="Areas"
        actions={<Link href="/admin/areas/new" className="btn btn-primary">+ New Area</Link>}
      />

      {areas.length === 0 ? (
        <div className="empty-state"><p>No areas yet. Create your first area.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Site Name</th>
                <th>Root Path</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => {
                const href = `/admin/areas/${area.id}`;
                const cell: React.CSSProperties = { display: "block", color: "inherit", textDecoration: "none", padding: "12px 16px" };
                return (
                  <tr key={area.id} className="row-link">
                    <td style={{ fontWeight: 600, padding: 0 }}>
                      <Link href={href} style={cell}>{area.displayName || area.name}</Link>
                    </td>
                    <td style={{ color: "var(--text-muted)", padding: 0 }}>
                      <Link href={href} style={cell}>{area.siteName || "—"}</Link>
                    </td>
                    <td style={{ padding: 0 }}>
                      <Link href={href} style={{ ...cell, fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {area.rootPath}
                      </Link>
                    </td>
                    <td style={{ padding: 0 }}>
                      <Link href={href} style={cell}>
                        <span className={`badge badge-${area.status}`}>{area.status}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
