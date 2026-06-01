"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Asset = { name: string; url: string; contentType: string; size: number };

interface MediaLibraryModalProps {
  onSelect: (url: string) => void;
  onClose:  () => void;
  filter?:  "image" | "video" | "all";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cleanName(raw: string) {
  // Strip leading timestamp-random prefix added on upload: "1234567890-abc123.jpg" → "abc123.jpg"
  const parts = raw.split("-");
  return parts.length > 1 && /^\d{13}$/.test(parts[0]) ? parts.slice(1).join("-") : raw;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MediaLibraryModal({ onSelect, onClose, filter = "all" }: MediaLibraryModalProps) {
  const [assets,          setAssets]          = useState<Asset[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [search,          setSearch]          = useState("");
  const [deleting,        setDeleting]        = useState<string | null>(null);
  const [confirmDelete,   setConfirmDelete]   = useState<Asset | null>(null);
  const [dragOver,        setDragOver]        = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState<{ done: number; total: number } | null>(null);

  const loadAssets = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/list-assets")
      .then((r) => r.json())
      .then((data: { assets?: Asset[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setAssets(data.assets ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function uploadOne(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res  = await fetch("/api/admin/upload-asset", { method: "POST", body: form });
    const data = await res.json() as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error ?? `Upload failed (${res.status})`);
  }

  function isAcceptable(file: File) {
    if (filter === "image") return file.type.startsWith("image/");
    if (filter === "video") return file.type.startsWith("video/");
    return file.type.startsWith("image/") || file.type.startsWith("video/");
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploadProgress) return;
    const files = Array.from(e.dataTransfer.files ?? []).filter(isAcceptable);
    if (files.length === 0) { setError("No supported files in drop"); return; }
    setError(null);
    setUploadProgress({ done: 0, total: files.length });
    for (let i = 0; i < files.length; i++) {
      try { await uploadOne(files[i]); }
      catch (err) { setError((err as Error).message); }
      setUploadProgress({ done: i + 1, total: files.length });
    }
    setUploadProgress(null);
    loadAssets();
  }

  async function handleDelete(asset: Asset) {
    setDeleting(asset.url);
    try {
      const res  = await fetch("/api/admin/delete-asset", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: asset.url }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Delete failed");
      setAssets((prev) => prev.filter((a) => a.url !== asset.url));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  const filtered = assets.filter((a) => {
    if (filter === "image" && !a.contentType.startsWith("image/")) return false;
    if (filter === "video" && !a.contentType.startsWith("video/")) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        onDragOver={(e) => { e.preventDefault(); if (!uploadProgress) setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        style={{
          background: "#fff", borderRadius: 12, width: 720, maxWidth: "95vw",
          maxHeight: "85vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative",
          outline: dragOver ? "3px dashed var(--primary)" : "none", outlineOffset: -2,
        }}
      >
        {/* Drag overlay */}
        {dragOver && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 5, borderRadius: 12,
            background: "rgba(46,90,151,0.12)", display: "flex", alignItems: "center",
            justifyContent: "center", pointerEvents: "none",
            color: "var(--primary)", fontWeight: 700, fontSize: "1.1rem",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>☁️</div>
              Drop files to upload
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, flex: 1 }}>
            🖼 Media Library
          </h3>
          <input
            className="form-control"
            style={{ width: 200, fontSize: "0.85rem" }}
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-icon" onClick={onClose} style={{ fontSize: "1.2rem" }}>✕</button>
        </div>

        {/* Hint / upload progress */}
        <div style={{ padding: "7px 20px", borderBottom: "1px solid var(--border)", fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
          ℹ️{" "}
          {uploadProgress
            ? <span style={{ color: "var(--primary)", fontWeight: 600 }}>Uploading {uploadProgress.done} / {uploadProgress.total}…</span>
            : <span>Drag files anywhere on this window to upload. Click an asset to select it.</span>
          }
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⏳</div>
              Loading assets…
            </div>
          )}
          {!loading && error && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--danger)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚠️</div>
              {error}
              <br />
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={loadAssets}>Retry</button>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📭</div>
              {search ? `No results for "${search}"` : "No assets yet. Drag files here to upload."}
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {filtered.map((asset) => (
                <div
                  key={asset.url}
                  style={{
                    background: "var(--bg-light)", border: "2px solid var(--border)",
                    borderRadius: 8, padding: 8, textAlign: "center",
                    transition: "border-color 0.15s", position: "relative",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(asset); }}
                    disabled={deleting === asset.url}
                    title="Delete"
                    style={{
                      position: "absolute", top: 4, right: 4, zIndex: 2,
                      background: "rgba(0,0,0,0.5)", color: "#fff",
                      border: "none", borderRadius: "50%", width: 20, height: 20,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", fontSize: "0.6rem", opacity: 0.7,
                      transition: "opacity 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "var(--danger)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "rgba(0,0,0,0.5)"; }}
                  >
                    {deleting === asset.url ? "⏳" : "✕"}
                  </button>

                  {/* Click to select */}
                  <button
                    onClick={() => { onSelect(asset.url); onClose(); }}
                    style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
                  >
                    {asset.contentType.startsWith("video/") ? (
                      <div style={{ width: "100%", height: 75, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", borderRadius: 4 }}>
                        <span style={{ fontSize: "1.8rem" }}>▶</span>
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={asset.url} alt={asset.name}
                        style={{ width: "100%", height: 75, objectFit: "cover", borderRadius: 4, display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", wordBreak: "break-all", lineHeight: 1.3 }}>
                      {cleanName(asset.name)}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{formatSize(asset.size)}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 360, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700 }}>⚠️ Delete Asset</h4>
            <p style={{ margin: "0 0 8px", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              This action cannot be undone. The file will be permanently removed from storage.
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "0.8rem", fontWeight: 600, wordBreak: "break-all" }}>
              {cleanName(confirmDelete.name)}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)} disabled={deleting !== null}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={deleting !== null}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
