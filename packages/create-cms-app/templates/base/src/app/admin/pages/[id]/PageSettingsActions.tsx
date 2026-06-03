"use client";

import { useEffect, useState } from "react";
import { PublishToggle, ButtonSpinner } from "@/components/admin/PublishToggle";
import { SlideDrawer } from "@/components/admin/SlideDrawer";
import { publishVersion } from "../actions";

type VersionInfo = {
  id: string;
  version: number;
  createdAt: string;
  publishedAt: string | null;
  componentCount: number;
  isCurrent: boolean;
  isPublished: boolean;
};

interface Props {
  pageId:               string;
  initialIsPublished:   boolean;
  publishedVersionNumber: number | null;
  publishedVersionId:   string | null;
  pageSlug:             string;
  isSystemPage?:        boolean;
}

export function PageSettingsActions({
  pageId,
  initialIsPublished,
  publishedVersionNumber,
  publishedVersionId: initialPublishedVersionId,
  pageSlug,
  isSystemPage = false,
}: Props) {
  const [isDirty,      setIsDirty]      = useState(false);
  const [isPublished,  setIsPublished]  = useState(initialIsPublished);
  const [pubVerNum,    setPubVerNum]    = useState(publishedVersionNumber);
  const [pubVerId,     setPubVerId]     = useState(initialPublishedVersionId);

  // History
  const [showHistory,    setShowHistory]    = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [versions,       setVersions]       = useState<VersionInfo[]>([]);
  const [pendingPubVerId, setPendingPubVerId] = useState<string | null>(null);

  // Watch settings form for changes
  useEffect(() => {
    const form = document.getElementById("settings-form") as HTMLFormElement | null;
    if (!form) return;
    const mark = () => setIsDirty(true);
    form.addEventListener("input",  mark);
    form.addEventListener("change", mark);
    return () => { form.removeEventListener("input", mark); form.removeEventListener("change", mark); };
  }, []);

  function handleSave() {
    window.dispatchEvent(new CustomEvent("cms:save-page-schema"));
    (document.getElementById("settings-form") as HTMLFormElement | null)?.requestSubmit();
    setIsDirty(false);
  }

  async function openHistory() {
    setShowHistory(true);
    setHistoryLoading(true);
    const res = await fetch(`/admin/pages/${pageId}/versions/data`);
    const data = await res.json();
    setVersions(data.versions ?? []);
    setHistoryLoading(false);
  }

  async function handlePublishVersion(versionId: string) {
    setPendingPubVerId(versionId);
    try {
      const result = await publishVersion(pageId, versionId);
      setPubVerId(result.versionId);
      setPubVerNum(result.versionNumber);
      setIsPublished(true);
      setShowHistory(false);
    } finally {
      setPendingPubVerId(null);
    }
  }

  const canPublish = !isDirty && !isPublished;

  return (
    <>
      {/* Save Settings — lit up only when form has changes */}
      <button
        className="btn btn-primary btn-sm"
        onClick={handleSave}
        disabled={!isDirty}
        style={{ opacity: !isDirty ? 0.55 : 1 }}
        title={isDirty ? "Save pending settings changes" : "No unsaved changes"}
      >
        Save Settings
      </button>

      {/* Publish toggle — same as content editor, with history */}
      <PublishToggle
        pageId={pageId}
        initialIsPublished={isPublished}
        canPublish={canPublish}
        publishedVersionNumber={pubVerNum}
        pageSlug={pageSlug}
        isSystemPage={isSystemPage}
        onOpenHistory={openHistory}
        onToggle={(published, info) => {
          setIsPublished(published);
          if (info?.versionNumber) setPubVerNum(info.versionNumber);
          if (info?.versionId)     setPubVerId(info.versionId);
          if (!published) { setPubVerNum(null); setPubVerId(null); }
        }}
      />

      {/* Version history drawer */}
      <SlideDrawer open={showHistory} onClose={() => setShowHistory(false)} title="Version History">
        {historyLoading ? (
          <div className="empty-state"><p>Loading…</p></div>
        ) : versions.length === 0 ? (
          <div className="empty-state"><p>No versions yet.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {versions.map((version) => {
              const publishing = pendingPubVerId === version.id;
              return (
                <div key={version.id} style={{
                  border: "1px solid var(--border)", borderRadius: 8,
                  padding: "12px 14px", background: "var(--bg-light)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>v{version.version}</span>
                        {version.isCurrent && (
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "0.68rem", padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>current</span>
                        )}
                        {version.id === pubVerId && (
                          <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "0.68rem", padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>live</span>
                        )}
                        {version.isPublished && version.id !== pubVerId && (
                          <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: "0.68rem", padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>was published</span>
                        )}
                      </div>
                      <p style={{ margin: "0 0 4px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {new Date(version.createdAt).toLocaleString()} · {version.componentCount} component{version.componentCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-icon"
                      title={version.id === pubVerId ? "This version is already live" : "Publish this saved version directly"}
                      onClick={() => void handlePublishVersion(version.id)}
                      disabled={version.id === pubVerId || publishing}
                      style={{ opacity: version.id === pubVerId || publishing ? 0.35 : 1, cursor: publishing ? "wait" : undefined }}
                    >
                      {publishing ? <ButtonSpinner size={14} color="var(--text)" /> : "↑"}
                    </button>
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Use ↑ to publish any historical snapshot directly as the live page.
            </p>
          </div>
        )}
      </SlideDrawer>
    </>
  );
}
