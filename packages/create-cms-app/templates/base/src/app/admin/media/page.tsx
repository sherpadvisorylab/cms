"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Asset = { name: string; url: string; storageUrl: string; contentType: string; size: number };
type FilterTab = "all" | "image" | "video" | "file";
type DupeConfirm = {
  slugName: string;
  addName: string;
  resolve: (action: "overwrite" | "add" | "cancel") => void;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function slugifyFilename(name: string): string {
  const dotIdx = name.lastIndexOf(".");
  const ext = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
  const base = dotIdx >= 0 ? name.slice(0, dotIdx) : name;
  const slug =
    base
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file";
  return ext ? `${slug}.${ext}` : slug;
}

function displayName(raw: string) {
  return /^\d{13}-/.test(raw) ? raw.replace(/^\d{13}-/, "") : raw;
}

function isImageAsset(a: Asset) { return a.contentType.startsWith("image/"); }
function isVideoAsset(a: Asset) { return a.contentType.startsWith("video/"); }

function findAvailableName(slugName: string, existingNames: Set<string>): string {
  if (!existingNames.has(slugName)) return slugName;
  const dotIdx = slugName.lastIndexOf(".");
  const base = dotIdx >= 0 ? slugName.slice(0, dotIdx) : slugName;
  const ext  = dotIdx >= 0 ? slugName.slice(dotIdx) : "";
  let counter = 2;
  while (existingNames.has(`${base}-${counter}${ext}`)) counter++;
  return `${base}-${counter}${ext}`;
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",   label: "All" },
  { key: "image", label: "Images" },
  { key: "video", label: "Videos" },
  { key: "file",  label: "Files" },
];

export default function MediaPage() {
  const [assets,          setAssets]          = useState<Asset[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [search,          setSearch]          = useState("");
  const [filterTab,       setFilterTab]       = useState<FilterTab>("all");
  const [deleting,        setDeleting]        = useState<string | null>(null);
  const [confirmDelete,   setConfirmDelete]   = useState<Asset | null>(null);
  const [dragOver,        setDragOver]        = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState<{ done: number; total: number } | null>(null);
  const [renaming,        setRenaming]        = useState<{ asset: Asset; value: string } | null>(null);
  const [renameLoading,   setRenameLoading]   = useState(false);
  const [renameError,     setRenameError]     = useState<string | null>(null);
  const [copiedUrl,       setCopiedUrl]       = useState<string | null>(null);
  const [dupeConfirm,     setDupeConfirm]     = useState<DupeConfirm | null>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/list-assets")
      .then((r) => r.json())
      .then((data: { assets?: Asset[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setAssets(data.assets ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  useEffect(() => {
    if (renaming) setTimeout(() => renameInputRef.current?.focus(), 0);
  }, [renaming]);

  // ── Upload ────────────────────────────────────────────────────────────────

  async function uploadOne(file: File, filename: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("filename", filename);
    const r = await fetch("/api/admin/upload-asset", { method: "POST", body: form });
    const data = (await r.json()) as { url?: string; error?: string };
    if (!r.ok || !data.url) throw new Error(data.error ?? `Upload failed (${r.status})`);
  }

  async function resolveFilename(file: File, existing: Set<string>): Promise<string | null> {
    const slugName = slugifyFilename(file.name);
    if (!existing.has(slugName)) return slugName;
    const addName = findAvailableName(slugName, existing);
    const action = await new Promise<"overwrite" | "add" | "cancel">((resolve) => {
      setDupeConfirm({ slugName, addName, resolve });
    });
    setDupeConfirm(null);
    if (action === "cancel") return null;
    return action === "overwrite" ? slugName : addName;
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setError(null);
    setUploadProgress({ done: 0, total: files.length });
    const existing = new Set(assets.map((a) => slugifyFilename(displayName(a.name))));
    for (let i = 0; i < files.length; i++) {
      try {
        const filename = await resolveFilename(files[i], existing);
        if (filename !== null) { await uploadOne(files[i], filename); existing.add(filename); }
      } catch (err) { setError((err as Error).message); }
      setUploadProgress({ done: i + 1, total: files.length });
    }
    setUploadProgress(null);
    loadAssets();
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(asset: Asset) {
    setDeleting(asset.name);
    try {
      const r = await fetch("/api/admin/delete-asset", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: asset.name }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || data.error) throw new Error(data.error ?? "Delete failed");
      setAssets((prev) => prev.filter((a) => a.name !== asset.name));
    } catch (err) { setError((err as Error).message); }
    finally { setDeleting(null); setConfirmDelete(null); }
  }

  // ── Rename ────────────────────────────────────────────────────────────────

  async function handleRename() {
    if (!renaming) return;
    const newName = slugifyFilename(renaming.value.trim());
    if (!newName || newName === renaming.asset.name) { setRenaming(null); return; }
    setRenameLoading(true);
    setRenameError(null);
    try {
      const r = await fetch("/api/admin/rename-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: renaming.asset.name, newName }),
      });
      const data = (await r.json()) as { url?: string; name?: string; error?: string };
      if (!r.ok || data.error) throw new Error(data.error ?? "Rename failed");
      setAssets((prev) =>
        prev.map((a) => a.name === renaming.asset.name ? { ...a, name: data.name!, url: data.url! } : a),
      );
      setRenaming(null);
    } catch (err) { setRenameError((err as Error).message); }
    finally { setRenameLoading(false); }
  }

  // ── Copy URL ──────────────────────────────────────────────────────────────

  async function handleCopy(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); }
    catch { return; }
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const imageCount = assets.filter(isImageAsset).length;
  const videoCount = assets.filter(isVideoAsset).length;
  const fileCount  = assets.length - imageCount - videoCount;
  const totalSize  = assets.reduce((s, a) => s + a.size, 0);

  const tabCount = (key: FilterTab) =>
    key === "all" ? assets.length : key === "image" ? imageCount : key === "video" ? videoCount : fileCount;

  const filtered = assets.filter((a) => {
    if (filterTab === "image" && !isImageAsset(a)) return false;
    if (filterTab === "video" && !isVideoAsset(a)) return false;
    if (filterTab === "file" && (isImageAsset(a) || isVideoAsset(a))) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ minHeight: "100%" }}
      onDragOver={(e) => { e.preventDefault(); if (!uploadProgress) setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={async (e) => { e.preventDefault(); setDragOver(false); if (!uploadProgress) await handleFiles(Array.from(e.dataTransfer.files)); }}
    >
      {dragOver && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(46,90,151,0.15)", border: "3px dashed var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px 48px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>⬆️</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>Drop to upload</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 12px", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Media Library</h1>
          {!loading && (
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {assets.length} assets · {formatSize(totalSize)} · {imageCount} images · {videoCount} videos · {fileCount} files
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="form-control"
            style={{ width: 200, fontSize: "0.85rem" }}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploadProgress}
            style={{ whiteSpace: "nowrap" }}
          >
            {uploadProgress ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…` : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files) handleFiles(Array.from(e.target.files)); e.target.value = ""; }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            style={{
              background: "none", border: "none", padding: "7px 16px", cursor: "pointer",
              fontSize: "0.82rem", fontWeight: filterTab === tab.key ? 700 : 400,
              color: filterTab === tab.key ? "var(--primary)" : "var(--text-muted)",
              borderBottom: filterTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -1, transition: "color 0.15s",
            }}
          >
            {tab.label} ({tabCount(tab.key)})
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.85rem", color: "#b91c1c", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#b91c1c" }}>✕</button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading assets…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          {search ? `No results for "${search}"` : "No assets yet. Drag files here or click Upload."}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {filtered.map((asset) => {
            const isRen = renaming?.asset.name === asset.name;
            return (
              <div
                key={asset.name}
                style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.09)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ background: "#f8fafc", borderBottom: "1px solid var(--border)", height: 120, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {isImageAsset(asset) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={asset.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : isVideoAsset(asset) ? (
                    <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: "2rem" }}>▶️</div>
                      <div style={{ fontSize: "0.7rem", marginTop: 4 }}>Video</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: "2rem" }}>📄</div>
                      <div style={{ fontSize: "0.7rem", marginTop: 4 }}>{asset.contentType.split("/")[1] ?? "file"}</div>
                    </div>
                  )}
                </div>

                <div style={{ padding: "8px 10px", flex: 1 }}>
                  {isRen ? (
                    <div>
                      <input
                        ref={renameInputRef}
                        className="form-control"
                        style={{ fontSize: "0.75rem", padding: "3px 6px", width: "100%", marginBottom: 4 }}
                        value={renaming!.value}
                        onChange={(e) => setRenaming({ ...renaming!, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename();
                          if (e.key === "Escape") { setRenaming(null); setRenameError(null); }
                        }}
                        disabled={renameLoading}
                      />
                      {renameError && <p style={{ margin: "0 0 4px", fontSize: "0.7rem", color: "var(--danger)" }}>{renameError}</p>}
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-primary btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px" }} onClick={handleRename} disabled={renameLoading}>
                          {renameLoading ? "…" : "Save"}
                        </button>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: "0.7rem", padding: "2px 8px" }} onClick={() => { setRenaming(null); setRenameError(null); }} disabled={renameLoading}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 2 }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text)", wordBreak: "break-all", lineHeight: 1.3, flex: 1 }} title={asset.name}>
                          {displayName(asset.name)}
                        </span>
                        <button
                          onClick={() => { setRenaming({ asset, value: displayName(asset.name) }); setRenameError(null); }}
                          title="Rename"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.8rem", color: "var(--text-muted)", flexShrink: 0, lineHeight: 1, opacity: 0.6 }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
                        >
                          ✏️
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)" }}>{formatSize(asset.size)}</p>
                    </div>
                  )}
                </div>

                {!isRen && (
                  <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
                    <button
                      onClick={() => handleCopy(asset.storageUrl, `path:${asset.name}`)}
                      title={asset.storageUrl}
                      style={{
                        flex: 1, background: "none", border: "none", borderRight: "1px solid var(--border)",
                        padding: "6px 4px", cursor: "pointer", fontSize: "0.65rem",
                        color: copiedUrl === `path:${asset.name}` ? "#16a34a" : "var(--text-muted)",
                        transition: "color 0.15s",
                      }}
                    >
                      {copiedUrl === `path:${asset.name}` ? "✓ Copied" : "Copy URL"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(asset)}
                      disabled={deleting === asset.name}
                      title="Delete"
                      style={{ flex: 1, background: "none", border: "none", padding: "6px 4px", cursor: "pointer", fontSize: "0.68rem", color: "var(--danger)", transition: "background 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                    >
                      {deleting === asset.name ? "…" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dupeConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 700 }}>File already exists</h4>
            <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "var(--text-muted)" }}>A file with this name is already in the library:</p>
            <p style={{ margin: "0 0 20px", fontSize: "0.82rem", fontWeight: 600, wordBreak: "break-all", background: "var(--bg-light)", padding: "6px 10px", borderRadius: 6 }}>{dupeConfirm.slugName}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-danger" style={{ textAlign: "left" }} onClick={() => dupeConfirm.resolve("overwrite")}>
                <strong>Overwrite</strong>
                <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 400, opacity: 0.8 }}>Replaces existing file, name stays <code>{dupeConfirm.slugName}</code></span>
              </button>
              <button className="btn btn-secondary" style={{ textAlign: "left" }} onClick={() => dupeConfirm.resolve("add")}>
                <strong>Add</strong>
                <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 400, opacity: 0.8 }}>Save as <code>{dupeConfirm.addName}</code></span>
              </button>
              <button className="btn btn-secondary" onClick={() => dupeConfirm.resolve("cancel")}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 360, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700 }}>Delete asset</h4>
            <p style={{ margin: "0 0 8px", fontSize: "0.88rem", color: "var(--text-muted)" }}>This action cannot be undone. The file will be permanently removed from storage.</p>
            <p style={{ margin: "0 0 20px", fontSize: "0.82rem", fontWeight: 600, wordBreak: "break-all" }}>{displayName(confirmDelete.name)}</p>
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
