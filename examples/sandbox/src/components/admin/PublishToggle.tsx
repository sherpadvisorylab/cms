"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { publishPage, unpublishPage } from "@/app/admin/pages/actions";

interface Props {
  pageId:             string;
  initialIsPublished: boolean;
  pageSlug?:          string;
  onToggle?:          (isPublished: boolean) => void;
}

export function PublishToggle({ pageId, initialIsPublished, pageSlug, onToggle }: Props) {
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [pending, startTransition]    = useTransition();
  const [open, setOpen]               = useState(false);
  const wrapRef                       = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handlePublish() {
    startTransition(async () => {
      await publishPage(pageId);
      setIsPublished(true);
      onToggle?.(true);
    });
  }

  function handleUnpublish() {
    setOpen(false);
    startTransition(async () => {
      await unpublishPage(pageId);
      setIsPublished(false);
      onToggle?.(false);
    });
  }

  // ── Draft state: green outlined "Publish" button ─────────────────────────
  if (!isPublished) {
    return (
      <button
        className="btn btn-sm"
        onClick={handlePublish}
        disabled={pending}
        style={{
          background:  "white",
          color:       "#15803d",
          border:      "1px solid #86efac",
          fontWeight:  600,
        }}
      >
        {pending ? "Publishing…" : "Publish"}
      </button>
    );
  }

  // ── Published state: green badge + dropdown with "Unpublish" ─────────────
  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <div style={{
        display: "inline-flex", alignItems: "center",
        background: "#dcfce7", border: "1px solid #bbf7d0",
        borderRadius: 6, overflow: "hidden", opacity: pending ? 0.6 : 1,
      }}>
        {/* Status label — not clickable */}
        <span style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", fontSize: "0.875rem", fontWeight: 600,
          color: "#15803d", userSelect: "none",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#16a34a", flexShrink: 0,
          }} />
          Published
        </span>

        {/* Dropdown trigger */}
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={pending}
          title="Publication options"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "5px 7px", background: "none", border: "none",
            borderLeft: "1px solid #bbf7d0", cursor: "pointer",
            color: "#15803d", fontSize: "0.7rem", lineHeight: 1,
          }}
        >
          {open ? "▴" : "▾"}
        </button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
          background: "white", border: "1px solid var(--border)",
          borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
          minWidth: 180, overflow: "hidden",
        }}>
          <div style={{
            padding: "8px 14px 6px",
            fontSize: "0.7rem", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em",
            color: "var(--text-muted)",
            borderBottom: "1px solid var(--border)",
          }}>
            Publication
          </div>
          {pageSlug && (
            <a
              href={`/${pageSlug}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "10px 14px",
                textDecoration: "none", fontSize: "0.875rem", color: "var(--text)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-light)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>↗</span>
              <div>
                <div style={{ fontWeight: 500 }}>View page</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 1 }}>
                  Open live page in new tab
                </div>
              </div>
            </a>
          )}
          <div style={{ borderTop: pageSlug ? "1px solid var(--border)" : "none" }} />
          <button
            onClick={handleUnpublish}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "10px 14px",
              textAlign: "left", background: "none", border: "none",
              cursor: "pointer", fontSize: "0.875rem", color: "var(--text)",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-light)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>↩</span>
            <div>
              <div style={{ fontWeight: 500 }}>Unpublish</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 1 }}>
                Move back to draft
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
