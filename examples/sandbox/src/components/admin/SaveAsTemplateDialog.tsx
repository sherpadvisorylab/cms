"use client";

import { useState } from "react";

interface SaveAsTemplateDialogProps {
  structure: unknown[];
  onClose: () => void;
}

export function SaveAsTemplateDialog({ structure, onClose }: SaveAsTemplateDialogProps) {
  const [name,   setName]   = useState("");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/page-templates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), structure }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 400,
        maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>

        <h4 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 700 }}>
          💾 Save as Template
        </h4>
        <p style={{ margin: "0 0 20px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Saves the current component structure as a reusable page template.
          Field values are not included — only the layout.
        </p>

        {saved ? (
          <div style={{ textAlign: "center", padding: "12px 0", color: "var(--success)", fontWeight: 600 }}>
            ✓ Template saved!
          </div>
        ) : (
          <>
            <input
              className="form-control"
              placeholder="Template name (e.g. FAQ Page, Landing Page…)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
              autoFocus
              style={{ marginBottom: 8 }}
            />
            {error && (
              <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginBottom: 8 }}>{error}</p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}
                disabled={saving || !name.trim()}>
                {saving ? "Saving…" : "Save Template"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
