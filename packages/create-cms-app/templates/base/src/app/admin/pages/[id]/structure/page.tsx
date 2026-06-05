"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { updateStructure } from "../../actions";
import { ComponentPickerModal } from "@/components/admin/ComponentPickerModal";
import { PageEditorHeader } from "../PageEditorHeader";
import { PublishToggle } from "@/components/admin/PublishToggle";
import type { ComponentInstance } from "@sherpacms/domain";

type ComponentMeta = { id: string; name: string; namespace: string | null; type: string; status: string };

function serializeStructure(structure: ComponentInstance[]) {
  return JSON.stringify(structure);
}

function ButtonSpinner({
  size = 12,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}33`,
        borderTopColor: color,
        display: "inline-block",
        animation: "cms-spin 0.7s linear infinite",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    />
  );
}

function VersionBadge({ versionNumber }: { versionNumber: number | null }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: versionNumber ? "#eff6ff" : "#f8fafc",
        border: `1px solid ${versionNumber ? "#bfdbfe" : "var(--border)"}`,
        color: versionNumber ? "#1d4ed8" : "var(--text-muted)",
        fontSize: "0.74rem",
        fontWeight: 700,
        lineHeight: 1,
      }}
      title={versionNumber ? `You are editing version ${versionNumber}` : "This page has not been versioned yet"}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: versionNumber ? "#2563eb" : "#94a3b8",
          flexShrink: 0,
        }}
      />
      {versionNumber ? `Editing v${versionNumber}` : "Draft"}
    </span>
  );
}

export default function StructurePage() {
  const params = useParams();
  const pageId = params.id as string;

  const [title, setTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [latestVersionId, setLatestVersionId] = useState<string | null>(null);
  const [publishedVersionId, setPublishedVersionId] = useState<string | null>(null);
  const [publishedVersionNumber, setPublishedVersionNumber] = useState<number | null>(null);
  const [editingVersionNumber, setEditingVersionNumber] = useState<number | null>(null);
  const [savedStructureJson, setSavedStructureJson] = useState("[]");
  const [structure, setStructure] = useState<ComponentInstance[]>([]);
  const [components, setComponents] = useState<ComponentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [insertAfter, setInsertAfter] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/admin/pages/${pageId}/structure/data`)
      .then((response) => response.json())
      .then((data) => {
        const nextStructure = data.structure ?? [];
        setTitle(data.title ?? "Page");
        setPageSlug(data.pageSlug ?? "");
        setIsPublished(!!data.isPublished);
        setLatestVersionId(data.latestVersionId ?? null);
        setPublishedVersionId(data.publishedVersionId ?? null);
        setPublishedVersionNumber(data.publishedVersionNumber ?? null);
        setEditingVersionNumber(data.latestVersionNumber ?? null);
        setStructure(nextStructure);
        setSavedStructureJson(serializeStructure(nextStructure));
        setComponents(data.components ?? []);
        setLoading(false);
      });
  }, [pageId]);

  function getComponent(id: string) {
    return components.find((component) => component.id === id);
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
    setStructure(structure.filter((_, itemIndex) => itemIndex !== idx));
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
    try {
      const result = await updateStructure(pageId, JSON.stringify(structure));
      setSaved(true);
      setLatestVersionId(result.versionId);
      setEditingVersionNumber(result.versionNumber);
      setSavedStructureJson(serializeStructure(structure));
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const hasUnsavedChanges = serializeStructure(structure) !== savedStructureJson;
  const canPublish = !hasUnsavedChanges && !!latestVersionId && (!isPublished || latestVersionId !== publishedVersionId);

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  return (
    <div>
      <style>{`@keyframes cms-spin{to{transform:rotate(360deg)}}`}</style>
      <PageEditorHeader
        id={pageId}
        title={title}
        isPublished={isPublished}
        badge={<VersionBadge versionNumber={editingVersionNumber} />}
        actions={
          <>
            {saved && <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600 }}>Saved</span>}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {saving && <ButtonSpinner color="#ffffff" />}
                {saving ? "Saving..." : "Save Structure"}
              </span>
            </button>
            <PublishToggle
              pageId={pageId}
              initialIsPublished={isPublished}
              canPublish={canPublish}
              publishedVersionNumber={publishedVersionNumber}
              pageSlug={pageSlug}
              onToggle={(published, info) => {
                setIsPublished(published);
                if (published && info?.versionId) {
                  setLatestVersionId(info.versionId);
                  setPublishedVersionId(info.versionId);
                }
                if (published && info?.versionNumber) {
                  setPublishedVersionNumber(info.versionNumber);
                  setEditingVersionNumber(info.versionNumber);
                }
                if (!published) {
                  setPublishedVersionId(null);
                  setPublishedVersionNumber(null);
                }
              }}
            />
          </>
        }
      />

      <div className="card" style={{ marginBottom: 16 }}>
        {structure.length === 0 ? (
          <div className="empty-state">
            <p>No components yet.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
              + Add component
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {structure.map((instance, idx) => {
              const component = getComponent(instance.componentId);
              return (
                <div
                  key={`${instance.componentId}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--bg-light)",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700, minWidth: 24 }}>#{idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{component?.name ?? instance.componentId}</span>
                    {component?.namespace && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: 8 }}>{component.namespace}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-icon" onClick={() => moveUp(idx)} disabled={idx === 0} title="Move up">▲</button>
                    <button className="btn-icon" onClick={() => moveDown(idx)} disabled={idx >= structure.length - 1} title="Move down">▼</button>
                    <button className="btn-icon" onClick={() => { setInsertAfter(idx); setShowPicker(true); }} title="Insert below" style={{ color: "var(--primary)" }}>+</button>
                    <button className="btn-icon" onClick={() => removeComponent(idx)} style={{ color: "var(--danger)" }} title="Remove">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {structure.length > 0 && (
        <button className="btn btn-secondary btn-sm" onClick={() => { setInsertAfter(null); setShowPicker(true); }}>
          + Add component to end
        </button>
      )}

      {showPicker && (
        <ComponentPickerModal components={components} onSelect={addComponent} onClose={() => { setShowPicker(false); setInsertAfter(null); }} />
      )}
    </div>
  );
}
