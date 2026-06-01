"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { updateStructure } from "../../actions";
import { ComponentPickerModal } from "@/components/admin/ComponentPickerModal";
import type { ComponentInstance } from "@cms/domain";

type ComponentMeta = { id: string; name: string; namespace: string | null; type: string; status: string };

export default function StructurePage() {
  const params   = useParams();
  const pageId   = params.id as string;

  const [pageTitle,   setPageTitle]   = useState("");
  const [structure,   setStructure]   = useState<ComponentInstance[]>([]);
  const [components,  setComponents]  = useState<ComponentMeta[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const [insertAfter, setInsertAfter] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/admin/pages/${pageId}/structure/data`)
      .then((r) => r.json())
      .then((d) => {
        setPageTitle(d.pageTitle ?? "Page");
        setStructure(d.structure ?? []);
        setComponents(d.components ?? []);
        setLoading(false);
      });
  }, [pageId]);

  function getComponent(id: string) {
    return components.find((c) => c.id === id);
  }

  function addComponent(componentId: string) {
    const newItem: ComponentInstance = { componentId, props: {} };
    if (insertAfter !== null) {
      const next = [...structure];
      next.splice(insertAfter + 1, 0, newItem);
      setStructure(next);
    } else {
      setStructure([...structure, newItem]);
    }
    setShowPicker(false);
    setInsertAfter(null);
  }

  function removeComponent(idx: number) {
    setStructure(structure.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...structure];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setStructure(next);
  }

  function moveDown(idx: number) {
    if (idx >= structure.length - 1) return;
    const next = [...structure];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setStructure(next);
  }

  async function handleSave() {
    setSaving(true);
    await updateStructure(pageId, JSON.stringify(structure));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="empty-state"><p>Loading…</p></div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{pageTitle} — Structure</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saved && <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "💾 Save Structure"}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        {structure.length === 0 ? (
          <div className="empty-state">
            <p>No components yet.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
              onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
              + Add component
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {structure.map((instance, idx) => {
              const comp = getComponent(instance.componentId);
              return (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", border: "1px solid var(--border)",
                  borderRadius: 8, background: "var(--bg-light)",
                }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)",
                    fontWeight: 700, minWidth: 24 }}>
                    #{idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                      {comp?.name ?? instance.componentId}
                    </span>
                    {comp?.namespace && (
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: 8 }}>
                        {comp.namespace}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-icon" onClick={() => moveUp(idx)} disabled={idx === 0}
                      title="Move up">▲</button>
                    <button className="btn-icon" onClick={() => moveDown(idx)} disabled={idx >= structure.length - 1}
                      title="Move down">▼</button>
                    <button className="btn-icon" onClick={() => { setInsertAfter(idx); setShowPicker(true); }}
                      title="Insert below" style={{ color: "var(--primary)" }}>+</button>
                    <button className="btn-icon" onClick={() => removeComponent(idx)}
                      style={{ color: "var(--danger)" }} title="Remove">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {structure.length > 0 && (
        <button className="btn btn-secondary btn-sm"
          onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
          + Add component to end
        </button>
      )}

      {showPicker && (
        <ComponentPickerModal
          components={components}
          onSelect={addComponent}
          onClose={() => { setShowPicker(false); setInsertAfter(null); }}
        />
      )}
    </div>
  );
}
