"use client";

import { useState, useTransition } from "react";
import { assignSystemPage, removeSystemPage } from "@/app/admin/pages/actions";

const SYSTEM_PAGE_TYPES: { type: string; label: string; icon: string; description: string }[] = [
  { type: "home", label: "Home",  icon: "🏠", description: "Served at the area root path (/)" },
  { type: "404",  label: "404",   icon: "🚫", description: "Rendered when no page matches the URL" },
];

interface Props {
  pageId:      string;
  areaName:    string;
  currentType: string | null; // which system page type this page is currently assigned as
}

export function SystemPageBadges({ pageId, areaName, currentType }: Props) {
  const [active, setActive] = useState<string | null>(currentType);
  const [pending, start]    = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null); // type waiting for confirm

  function handleBadgeClick(type: string) {
    if (active === type) {
      // Unassign
      start(async () => {
        await removeSystemPage(areaName, type);
        setActive(null);
      });
    } else {
      setConfirm(type);
    }
  }

  function handleConfirm() {
    if (!confirm) return;
    const type = confirm;
    setConfirm(null);
    start(async () => {
      await assignSystemPage(areaName, type, pageId);
      setActive(type);
    });
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
      <label className="form-label" style={{ marginBottom: 8, display: "block" }}>
        System page
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SYSTEM_PAGE_TYPES.map(({ type, label, icon, description }) => {
          const isActive = active === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleBadgeClick(type)}
              disabled={pending}
              title={description}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 999, fontSize: "0.82rem",
                fontWeight: 600, cursor: pending ? "wait" : "pointer",
                border: `1px solid ${isActive ? "#16a34a" : "var(--border)"}`,
                background: isActive ? "#dcfce7" : "var(--bg-light)",
                color: isActive ? "#15803d" : "var(--text-muted)",
                transition: "all 0.12s",
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {isActive && <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>✓</span>}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: 6 }}>
        {active
          ? `This page is the system ${SYSTEM_PAGE_TYPES.find(t => t.type === active)?.label} page. Click the badge to unassign.`
          : "Click a badge to designate this page as a system page."}
      </p>

      {/* Confirm dialog */}
      {confirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: 24, width: 380,
            maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 700 }}>
              {SYSTEM_PAGE_TYPES.find(t => t.type === confirm)?.icon}{" "}
              Assign as {SYSTEM_PAGE_TYPES.find(t => t.type === confirm)?.label} page
            </h4>
            <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              This page will become the system <strong>{confirm}</strong> page for area <strong>{areaName}</strong>.
              <br /><br />
              If another page was previously assigned, it will be moved to draft with a <code>_bkp</code> slug suffix.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirm}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
