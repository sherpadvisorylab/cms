"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { publishPage, unpublishPage } from "@/app/admin/pages/actions";

interface Props {
  pageId: string;
  initialIsPublished: boolean;
  canPublish?: boolean;
  publishedVersionNumber?: number | null;
  pageSlug?: string;
  onOpenHistory?: () => void;
  onToggle?: (isPublished: boolean, info?: { versionId?: string; versionNumber?: number | null }) => void;
}

export function PublishToggle({
  pageId,
  initialIsPublished,
  canPublish = !initialIsPublished,
  publishedVersionNumber = null,
  pageSlug,
  onOpenHistory,
  onToggle,
}: Props) {
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"publish" | "unpublish" | null>(null);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsPublished(initialIsPublished);
  }, [initialIsPublished]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handlePublish() {
    setPendingAction("publish");
    startTransition(async () => {
      try {
        const result = await publishPage(pageId);
        setIsPublished(true);
        onToggle?.(true, { versionId: result.versionId, versionNumber: result.versionNumber });
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleUnpublish() {
    setOpen(false);
    setPendingAction("unpublish");
    startTransition(async () => {
      try {
        await unpublishPage(pageId);
        setIsPublished(false);
        onToggle?.(false);
      } finally {
        setPendingAction(null);
      }
    });
  }

  const mainLabel = pendingAction === "publish"
    ? "Publishing..."
    : isPublished && !canPublish
      ? "Published"
      : "Publish";
  const mainDisabled = pending || !canPublish;
  const publishedLabel = publishedVersionNumber ? `Live v${publishedVersionNumber}` : "Live draft";
  const publishedTitle = publishedVersionNumber
    ? `Currently published version: v${publishedVersionNumber}`
    : "This page does not have a published version yet";

  return (
    <>
      <style>{`@keyframes cms-spin{to{transform:rotate(360deg)}}`}</style>
      <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "stretch",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #bbf7d0",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          <button
            type="button"
            className="btn btn-sm"
            onClick={handlePublish}
            disabled={mainDisabled}
            style={{
              border: "none",
              borderRadius: 0,
              background: mainDisabled ? "#f0fdf4" : "#dcfce7",
              color: mainDisabled ? "#65a30d" : "#15803d",
              fontWeight: 700,
              opacity: mainDisabled ? 0.75 : 1,
              paddingInline: 14,
            }}
            title={canPublish ? "Publish the current saved version" : "No unpublished saved version to publish"}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {pendingAction === "publish" ? (
                <ButtonSpinner color={canPublish ? "#15803d" : "#65a30d"} />
              ) : (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: canPublish ? "#16a34a" : "#86efac",
                    flexShrink: 0,
                  }}
                />
              )}
              {mainLabel}
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: canPublish ? "#166534" : "#4d7c0f",
                  opacity: 0.9,
                }}
                title={publishedTitle}
              >
                ({publishedLabel})
              </span>
            </span>
          </button>

          <button
            type="button"
            title="Publication options"
            aria-expanded={open}
            disabled={pending}
            onClick={() => setOpen((current) => !current)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              border: "none",
              borderLeft: "1px solid #bbf7d0",
              background: "#dcfce7",
              color: "#15803d",
              cursor: pending ? "wait" : "pointer",
              fontSize: "0.72rem",
              lineHeight: 1,
              opacity: pending ? 0.7 : 1,
            }}
          >
            {open ? "▴" : "▾"}
          </button>
        </div>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 200,
              minWidth: 220,
              overflow: "hidden",
              border: "1px solid var(--border)",
              borderRadius: 10,
              background: "#fff",
              boxShadow: "0 12px 30px rgba(15,23,42,0.14)",
            }}
          >
            <div
              style={{
                padding: "8px 14px 6px",
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              Publication
            </div>

            {onOpenHistory && (
              <MenuButton
                label="History"
                description="Review and restore saved versions"
                icon="⏱"
                onClick={() => {
                  setOpen(false);
                  onOpenHistory();
                }}
              />
            )}

            {pageSlug && (
              <a
                href={`/${pageSlug}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
                onClick={() => setOpen(false)}
              >
                <MenuLink
                  label="View page"
                  description="Open the generated page in a new tab"
                  icon="↗"
                />
              </a>
            )}

            {isPublished && (
              <MenuButton
                label="Unpublish"
                description="Move the page back to draft"
                icon="↩"
                loading={pendingAction === "unpublish"}
                onClick={handleUnpublish}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

function MenuButton({
  label,
  description,
  icon,
  loading = false,
  onClick,
}: {
  label: string;
  description: string;
  icon: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "11px 14px",
        textAlign: "left",
        background: "none",
        border: "none",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={(event) => { event.currentTarget.style.background = "var(--bg-light)"; }}
      onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: "1rem", lineHeight: 1, minWidth: 16, display: "inline-flex", justifyContent: "center" }}>
        {loading ? <ButtonSpinner size={14} color="var(--text)" /> : icon}
      </span>
      <span>
        <span style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: "0.73rem", color: "var(--text-muted)", marginTop: 1 }}>
          {loading ? "Working..." : description}
        </span>
      </span>
    </button>
  );
}

function MenuLink({
  label,
  description,
  icon,
}: {
  label: string;
  description: string;
  icon: string;
}) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "11px 14px",
      }}
      onMouseEnter={(event) => { (event.currentTarget as HTMLSpanElement).style.background = "var(--bg-light)"; }}
      onMouseLeave={(event) => { (event.currentTarget as HTMLSpanElement).style.background = "transparent"; }}
    >
      <span style={{ fontSize: "1rem", lineHeight: 1 }}>{icon}</span>
      <span>
        <span style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: "0.73rem", color: "var(--text-muted)", marginTop: 1 }}>{description}</span>
      </span>
    </span>
  );
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
