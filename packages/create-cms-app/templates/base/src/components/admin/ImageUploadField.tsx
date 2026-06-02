"use client";

import { useRef, useState } from "react";
import { MediaLibraryModal } from "./MediaLibraryModal";

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
  /** "image" | "video" | "all" — defaults to "image" */
  accept?: "image" | "video" | "all";
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

  const url      = getImageUrl(value);
  const alt      = getImageAlt(value);
  const isVideo  = url && /\.(mp4|webm|mov)/i.test(url);
  const acceptAttr = accept === "video" ? "video/*" : accept === "all" ? "image/*,video/*" : "image/*";

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
    return file.type.startsWith("image/") || file.type.startsWith("video/");
  }

  async function handleFile(file: File) {
    if (!isAcceptable(file)) { setError(`Unsupported file type: ${file.type || "unknown"}`); return; }
    setError(null);
    setUploading(true);
    try {
      const slugName   = slugifyFilename(file.name);
      const originalAlt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      const form = new FormData();
      form.append("file", file);
      form.append("filename", slugName);
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
      {url && !error && (url.startsWith("http") || url.startsWith("/")) && (
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
    </div>
      {hint && (
        <span className="form-hint" style={{ display: "block", marginTop: 4, fontSize: "0.75rem" }}>{hint}</span>
      )}
    </div>
  );
}
