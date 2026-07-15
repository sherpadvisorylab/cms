"use client";

import { useRef, useState } from "react";
import { MediaLibraryModal } from "./MediaLibraryModal";

type DupeConfirm = {
  slugName: string;
  addName: string;
  resolve: (action: "overwrite" | "add" | "cancel") => void;
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type ImageObjectValue = { url: string; alt?: string };
export type ImageValue = string | ImageObjectValue | null | undefined;

export function getImageUrl(v: ImageValue): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.url ?? "";
}
export function getImageAlt(v: ImageValue): string {
  if (!v || typeof v === "string") return "";
  return v.alt ?? "";
}
export function buildImageValue(url: string, alt: string): ImageObjectValue {
  return { url, alt };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface ImageUploadFieldProps {
  value: ImageValue;
  onChange: (next: ImageValue) => void;
  placeholder?: string;
  /** Label displayed above the input */
  label?: string;
  /** Hint displayed below the input */
  hint?: string;
  /** When true renders on a dark background (for dark logo preview) */
  dark?: boolean;
  /** "image" | "video" | "file" | "all" — defaults to "image" */
  accept?: "image" | "video" | "file" | "all";
  /** When true, renders an alt-text input and emits {url, alt} objects */
  withAlt?: boolean;
}

export function ImageUploadField({
  value,
  onChange,
  placeholder,
  label,
  hint,
  dark = false,
  accept = "image",
  withAlt = false,
}: ImageUploadFieldProps) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [uploading,    setUploading]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [showLibrary,  setShowLibrary]  = useState(false);
  const [dupeConfirm,  setDupeConfirm]  = useState<DupeConfirm | null>(null);

  const url      = getImageUrl(value);
  const alt      = getImageAlt(value);
  const isVideo  = url && /\.(mp4|webm|mov)/i.test(url);
  const acceptAttr = accept === "video" ? "video/*" : accept === "file" ? "" : accept === "all" ? "image/*,video/*" : "image/*";

  function emitUrl(nextUrl: string, suggestedAlt?: string) {
    if (withAlt) onChange(buildImageValue(nextUrl, suggestedAlt ?? alt));
    else onChange(nextUrl);
  }
  function emitAlt(nextAlt: string) {
    if (!withAlt) return;
    onChange(buildImageValue(url, nextAlt));
  }

  function slugifyFilename(name: string): string {
    const dotIdx = name.lastIndexOf(".");
    const ext    = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
    const base   = dotIdx >= 0 ? name.slice(0, dotIdx) : name;
    const slug   = base
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file";
    return ext ? `${slug}.${ext}` : slug;
  }

  function isAcceptable(file: File) {
    if (accept === "image") return file.type.startsWith("image/");
    if (accept === "video") return file.type.startsWith("video/");
    if (accept === "file") return true;
    return file.type.startsWith("image/") || file.type.startsWith("video/");
  }

  function findAvailableName(slugName: string, existingNames: Set<string>): string {
    if (!existingNames.has(slugName)) return slugName;
    const dotIdx = slugName.lastIndexOf(".");
    const base = dotIdx >= 0 ? slugName.slice(0, dotIdx) : slugName;
    const ext  = dotIdx >= 0 ? slugName.slice(dotIdx) : "";
    let counter = 2;
    while (existingNames.has(`${base}-${counter}${ext}`)) counter++;
    return `${base}-${counter}${ext}`;
  }

  async function handleFile(file: File) {
    if (!isAcceptable(file)) { setError(`Unsupported file type: ${file.type || "unknown"}`); return; }
    setError(null);
    setUploading(true);
    try {
      const slugName    = slugifyFilename(file.name);
      const originalAlt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

      // Check for duplicate
      const listRes = await fetch("/api/admin/list-assets");
      const listData = await listRes.json() as { assets?: { name: string }[] };
      const existingNames = new Set((listData.assets ?? []).map((a) => a.name));
      let filename = slugName;
      if (existingNames.has(slugName)) {
        const addName = findAvailableName(slugName, existingNames);
        const action = await new Promise<"overwrite" | "add" | "cancel">((resolve) => {
          setDupeConfirm({ slugName, addName, resolve });
        });
        setDupeConfirm(null);
        if (action === "cancel") return;
        filename = action === "overwrite" ? slugName : addName;
      }

      const form = new FormData();
      form.append("file", file);
      form.append("filename", filename);
      const res  = await fetch("/api/admin/upload-asset", { method: "POST", body: form });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? `Upload failed (${res.status})`);
      emitUrl(data.url, !alt ? originalAlt : undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      {label && (
        <label className="form-label" style={{ marginBottom: 6, display: "block" }}>{label}</label>
      )}
    <div
      onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      style={{
        position: "relative",
        padding: dragOver ? 8 : 0,
        border: dragOver ? "2px dashed var(--primary)" : "2px dashed transparent",
        borderRadius: 6,
        background: dragOver ? "rgba(46,90,151,0.05)" : "transparent",
        transition: "padding 0.12s, background 0.12s",
      }}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--primary)", fontSize: "0.85rem", fontWeight: 600,
          pointerEvents: "none", background: "rgba(255,255,255,0.7)",
        }}>
          ↑ Drop to upload
        </div>
      )}

      {/* URL input + Upload + Library */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          className="form-control"
          value={url}
          onChange={(e) => emitUrl(e.target.value)}
          placeholder={placeholder ?? "https://example.com/image.jpg"}
          style={{ flex: 1, fontSize: "0.85rem" }}
        />
        <button type="button" className="btn btn-secondary btn-sm"
          onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ whiteSpace: "nowrap" }} title="Upload file">
          {uploading ? "⏳" : "↑ Upload"}
        </button>
        <button type="button" className="btn btn-secondary btn-sm"
          onClick={() => setShowLibrary(true)} disabled={uploading}
          title="Media library" style={{ whiteSpace: "nowrap" }}>
          🖼
        </button>
        {url && (
          <button type="button" className="btn-icon" onClick={() => emitUrl("")} title="Clear">✕</button>
        )}
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: 4, marginBottom: 0 }}>{error}</p>
      )}

      {/* Preview */}
      {url && !error && accept === "file" && (
        <div style={{ marginTop: 8 }}>
          <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: "0.82rem", wordBreak: "break-all" }}>
            {url}
          </a>
        </div>
      )}
      {url && !error && accept !== "file" && (url.startsWith("http") || url.startsWith("/")) && (
        <div style={{ marginTop: 8 }}>
          {isVideo ? (
            <video src={url} controls style={{ maxWidth: 280, maxHeight: 100, borderRadius: 4, border: "1px solid var(--border)", display: "block" }} />
          ) : (
            <div style={{
              display: "inline-block", borderRadius: 4, border: "1px solid var(--border)",
              backgroundImage: "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
              backgroundSize: "12px 12px", backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
              backgroundColor: "#e8e8e8",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={alt || "preview"}
                style={{ maxWidth: 160, maxHeight: 80, borderRadius: 4, objectFit: "contain", display: "block" }}
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
            </div>
          )}
        </div>
      )}

      {/* Alt text */}
      {withAlt && (
        <div style={{ marginTop: 6 }}>
          <input className="form-control" value={alt} onChange={(e) => emitAlt(e.target.value)}
            placeholder="Alt text — describe the image for screen readers"
            style={{ fontSize: "0.82rem" }} />
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2, display: "block" }}>
            Accessible via <code style={{ background: "#f1f5f9", padding: "0 2px", borderRadius: 2 }}>{"{{ fieldKey_alt }}"}</code> in Liquid templates.
          </span>
        </div>
      )}

      <input ref={fileRef} type="file" accept={acceptAttr} style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {showLibrary && (
        <MediaLibraryModal
          filter={accept}
          onSelect={(selectedUrl, selectedAlt) => emitUrl(selectedUrl, !alt ? selectedAlt : undefined)}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {dupeConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
    </div>
      {hint && (
        <span className="form-hint" style={{ display: "block", marginTop: 4, fontSize: "0.75rem" }}>{hint}</span>
      )}
    </div>
  );
}
