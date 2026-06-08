import React from "react";
import { cms } from "@/lib/cms";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Users",
  "Manage CMS users, roles, and account status.",
);

export default async function UsersPage() {
  const users = await cms.users.findAll();

  return (
    <div>
      <AdminPageHeader
        title="Users"
        actions={<Link href="/admin/users/new" className="btn btn-primary">+ New User</Link>}
      />

      {users.length === 0 ? (
        <div className="empty-state"><p>No users yet.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const href = `/admin/users/${u.id}`;
                const cell: React.CSSProperties = { display: "block", color: "inherit", textDecoration: "none", padding: "12px 16px" };
                return (
                  <tr key={u.id} className="row-link">
                    <td style={{ fontWeight: 600, padding: 0 }}>
                      <Link href={href} style={cell}>{u.name}</Link>
                    </td>
                    <td style={{ padding: 0 }}>
                      <Link href={href} style={{ ...cell, color: "var(--text-muted)" }}>{u.email}</Link>
                    </td>
                    <td style={{ padding: 0 }}>
                      <Link href={href} style={{ ...cell, color: "var(--text-muted)", textTransform: "capitalize" }}>{u.role}</Link>
                    </td>
                    <td style={{ padding: 0 }}>
                      <Link href={href} style={cell}>
                        <span className={`badge badge-${u.status}`}>{u.status}</span>
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
