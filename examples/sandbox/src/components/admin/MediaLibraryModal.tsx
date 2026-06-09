"use client";

import { useCallback, useEffect, useState } from "react";

type Asset = { name: string; url: string; contentType: string; size: number };
type MediaLibraryFilter = "image" | "video" | "file" | "all";

interface MediaLibraryModalProps {
  onSelect: (url: string, alt?: string) => void;
  onClose: () => void;
  filter?: MediaLibraryFilter;
}

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
  const slug = base
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";
  return ext ? `${slug}.${ext}` : slug;
}

function altFromSlug(slugName: string): string {
  const dotIdx = slugName.lastIndexOf(".");
  const base = dotIdx >= 0 ? slugName.slice(0, dotIdx) : slugName;
  const clean = /^\d{13}-/.test(base) ? base.replace(/^\d{13}-/, "") : base;
  return clean.replace(/-+/g, " ").trim();
}

function findAvailableName(slugName: string, existingNames: Set<string>): string {
  if (!existingNames.has(slugName)) return slugName;
  const dotIdx = slugName.lastIndexOf(".");
  const base = dotIdx >= 0 ? slugName.slice(0, dotIdx) : slugName;
  const ext = dotIdx >= 0 ? slugName.slice(dotIdx) : "";
  let counter = 2;
  while (existingNames.has(`${base}-${counter}${ext}`)) counter++;
  return `${base}-${counter}${ext}`;
}

function displayName(raw: string) {
  return /^\d{13}-/.test(raw) ? raw.replace(/^\d{13}-/, "") : raw;
}

function isImageAsset(asset: Asset) {
  return asset.contentType.startsWith("image/");
}

function isVideoAsset(asset: Asset) {
  return asset.contentType.startsWith("video/");
}

export function MediaLibraryModal({ onSelect, onClose, filter = "all" }: MediaLibraryModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Asset | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dupeConfirm, setDupeConfirm] = useState<DupeConfirm | null>(null);

  const loadAssets = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/list-assets")
      .then((response) => response.json())
      .then((data: { assets?: Asset[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setAssets(data.assets ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !dupeConfirm && !confirmDelete) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmDelete, dupeConfirm, onClose]);

  async function uploadOne(file: File, filename: string): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("filename", filename);
    const response = await fetch("/api/admin/upload-asset", { method: "POST", body: form });
    const data = await response.json() as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      throw new Error(data.error ?? `Upload failed (${response.status})`);
    }
    return data.url;
  }

  async function resolveFilename(file: File, existingNames: Set<string>): Promise<string | null> {
    const slugName = slugifyFilename(file.name);
    if (!existingNames.has(slugName)) return slugName;

    const addName = findAvailableName(slugName, existingNames);
    const action = await new Promise<"overwrite" | "add" | "cancel">((resolve) => {
      setDupeConfirm({ slugName, addName, resolve });
    });
    setDupeConfirm(null);

    if (action === "cancel") return null;
    return action === "overwrite" ? slugName : addName;
  }

  function isAcceptable(file: File) {
    if (filter === "image") return file.type.startsWith("image/");
    if (filter === "video") return file.type.startsWith("video/");
    if (filter === "file") return !file.type.startsWith("image/") && !file.type.startsWith("video/");
    return true;
  }

  async function handleFiles(files: File[]) {
    const acceptable = files.filter(isAcceptable);
    if (acceptable.length === 0) {
      setError("No supported files in drop");
      return;
    }

    setError(null);
    setUploadProgress({ done: 0, total: acceptable.length });

    const existingNames = new Set(assets.map((asset) => slugifyFilename(displayName(asset.name))));

    for (let index = 0; index < acceptable.length; index += 1) {
      try {
        const filename = await resolveFilename(acceptable[index], existingNames);
        if (filename !== null) {
          await uploadOne(acceptable[index], filename);
          existingNames.add(filename);
        }
      } catch (err) {
        setError((err as Error).message);
      }
      setUploadProgress({ done: index + 1, total: acceptable.length });
    }

    setUploadProgress(null);
    loadAssets();
  }

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (uploadProgress) return;
    await handleFiles(Array.from(event.dataTransfer.files ?? []));
  }

  async function handleDelete(asset: Asset) {
    setDeleting(asset.url);
    try {
      const response = await fetch("/api/admin/delete-asset", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: asset.name }),
      });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Delete failed");
      setAssets((current) => current.filter((candidate) => candidate.url !== asset.url));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  const filtered = assets.filter((asset) => {
    if (filter === "image" && !isImageAsset(asset)) return false;
    if (filter === "video" && !isVideoAsset(asset)) return false;
    if (filter === "file" && (isImageAsset(asset) || isVideoAsset(asset))) return false;
    if (search && !asset.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(event) => { if (event.target === event.currentTarget && !dupeConfirm) onClose(); }}
    >
      <div
        onDragOver={(event) => { event.preventDefault(); if (!uploadProgress) setDragOver(true); }}
        onDragLeave={(event) => { event.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        style={{
          background: "#fff",
          borderRadius: 12,
          width: 720,
          maxWidth: "95vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          outline: dragOver ? "3px dashed var(--primary)" : "none",
          outlineOffset: -2,
        }}
      >
        {dragOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              borderRadius: 12,
              background: "rgba(46,90,151,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              color: "var(--primary)",
              fontWeight: 700,
              fontSize: "1.1rem",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>Cloud</div>
              Drop files to upload
            </div>
          </div>
        )}

        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, flex: 1 }}>
            Media Library
          </h3>
          <input
            className="form-control"
            style={{ width: 200, fontSize: "0.85rem" }}
            placeholder="Search..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="btn-icon" onClick={onClose} style={{ fontSize: "1.2rem" }}>X</button>
        </div>

        <div style={{ padding: "7px 20px", borderBottom: "1px solid var(--border)", fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
          <span>Info</span>
          {uploadProgress
            ? <span style={{ color: "var(--primary)", fontWeight: 600 }}>Uploading {uploadProgress.done} / {uploadProgress.total}...</span>
            : <span>Drag files anywhere on this window to upload. Click an asset to select it.</span>}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>...</div>
              Loading assets...
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--danger)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>!</div>
              {error}
              <br />
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={loadAssets}>Retry</button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>Inbox</div>
              {search ? `No results for "${search}"` : "No assets yet. Drag files here to upload."}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {filtered.map((asset) => (
                <div
                  key={asset.url}
                  style={{
                    background: "var(--bg-light)",
                    border: "2px solid var(--border)",
                    borderRadius: 8,
                    padding: 8,
                    textAlign: "center",
                    transition: "border-color 0.15s",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                  }}
                  onMouseEnter={(event) => { event.currentTarget.style.borderColor = "var(--primary)"; }}
                  onMouseLeave={(event) => { event.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <button
                    onClick={(event) => { event.stopPropagation(); setConfirmDelete(asset); }}
                    disabled={deleting === asset.url}
                    title="Delete"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      zIndex: 2,
                      background: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "0.6rem",
                      opacity: 0.7,
                      transition: "opacity 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.opacity = "1";
                      event.currentTarget.style.background = "var(--danger)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.opacity = "0.7";
                      event.currentTarget.style.background = "rgba(0,0,0,0.5)";
                    }}
                  >
                    {deleting === asset.url ? "..." : "X"}
                  </button>

                  <button
                    onClick={() => { onSelect(asset.url, altFromSlug(asset.name)); onClose(); }}
                    style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
                  >
                    {isVideoAsset(asset) ? (
                      <div style={{ width: "100%", height: 75, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", borderRadius: 4 }}>
                        <span style={{ fontSize: "1.8rem" }}>Play</span>
                      </div>
                    ) : isImageAsset(asset) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={asset.url}
                        alt={altFromSlug(asset.name)}
                        style={{ width: "100%", height: 75, objectFit: "cover", borderRadius: 4, display: "block" }}
                        onError={(event) => { (event.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: 75, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 4, border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "1.8rem" }}>File</span>
                      </div>
                    )}
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", wordBreak: "break-all", lineHeight: 1.3 }}>
                      {displayName(asset.name)}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{formatSize(asset.size)}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {dupeConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 700 }}>File già esistente</h4>
            <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Un file con questo nome è già presente nella libreria:
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "0.82rem", fontWeight: 600, wordBreak: "break-all", background: "var(--bg-light)", padding: "6px 10px", borderRadius: 6 }}>
              {dupeConfirm.slugName}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-danger" style={{ textAlign: "left" }} onClick={() => dupeConfirm.resolve("overwrite")}>
                <strong>Sovrascrivi</strong>
                <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 400, opacity: 0.8 }}>Sostituisce il file esistente, il nome rimane <code>{dupeConfirm.slugName}</code></span>
              </button>
              <button className="btn btn-secondary" style={{ textAlign: "left" }} onClick={() => dupeConfirm.resolve("add")}>
                <strong>Aggiungi</strong>
                <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 400, opacity: 0.8 }}>Salva come <code>{dupeConfirm.addName}</code></span>
              </button>
              <button className="btn btn-secondary" onClick={() => dupeConfirm.resolve("cancel")}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(event) => { if (event.target === event.currentTarget) setConfirmDelete(null); }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 360, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700 }}>Delete Asset</h4>
            <p style={{ margin: "0 0 8px", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              This action cannot be undone. The file will be permanently removed from storage.
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "0.8rem", fontWeight: 600, wordBreak: "break-all" }}>
              {displayName(confirmDelete.name)}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)} disabled={deleting !== null}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={deleting !== null}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
