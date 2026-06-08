"use client";

import { useState, useEffect } from "react";
import {
  fetchPagesForModal,
  fetchPageStructureForModal,
  copyComponentToPage,
  moveComponentToPage,
  linkComponentToPage,
} from "@/app/admin/pages/actions";
import type { ComponentInstance } from "@sherpacms/domain";

type PageInfo = { id: string; title: string; permalink: string; area: string; status: string };
type TargetComponent = { instance: ComponentInstance; name: string; namespace: string | null };
type Step = "page" | "component" | "save";
type Position = "above" | "below" | "start";

interface Props {
  mode: "copy" | "move" | "link";
  sourcePageId: string;
  sourcePageTitle: string;
  sourceIndex: number;
  sourceInstance: ComponentInstance;
  sourceComponentName: string;
  onClose: () => void;
  onSuccess: (mode: "copy" | "move" | "link", sourceIndex: number, targetPageId: string) => Promise<void>;
}

export function ComponentActionModal({
  mode,
  sourcePageId,
  sourcePageTitle,
  sourceIndex,
  sourceInstance,
  sourceComponentName,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>("page");
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [targetPage, setTargetPage] = useState<PageInfo | null>(null);
  const [targetComponents, setTargetComponents] = useState<TargetComponent[]>([]);
  const [structureLoading, setStructureLoading] = useState(false);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    fetchPagesForModal().then((p) => {
      setPages(p);
      setPagesLoading(false);
    });
  }, []);

  async function selectPage(page: PageInfo) {
    setTargetPage(page);
    setSelectedIdx(null);
    setPosition(null);
    setStructureLoading(true);
    setStep("component");
    const data = await fetchPageStructureForModal(page.id);
    setTargetComponents(
      data.structure.map((inst) => ({
        instance: inst,
        name: data.componentNames[inst.componentId]?.name ?? inst.componentId,
        namespace: data.componentNames[inst.componentId]?.namespace ?? null,
      })),
    );
    setStructureLoading(false);
  }

  function selectPosition(idx: number | null, pos: Position) {
    setSelectedIdx(idx);
    setPosition(pos);
    setStep("save");
  }

  async function confirm() {
    if (!targetPage || position === null) return;
    setSaving(true);
    setError(null);
    try {
      if (mode === "copy") {
        await copyComponentToPage(
          sourcePageId,
          JSON.stringify(sourceInstance),
          targetPage.id,
          selectedIdx,
          position,
        );
      } else if (mode === "move") {
        await moveComponentToPage(
          sourcePageId,
          sourceIndex,
          JSON.stringify(sourceInstance),
          targetPage.id,
          selectedIdx,
          position,
        );
      } else {
        await linkComponentToPage(
          sourcePageId,
          sourceIndex,
          targetPage.id,
          selectedIdx,
          position,
        );
      }
      await onSuccess(mode, sourceIndex, targetPage.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setSaving(false);
    }
  }

  const filteredPages = pages.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.permalink.toLowerCase().includes(search.toLowerCase()),
  );

  const actionLabel = mode === "copy" ? "Copy" : mode === "move" ? "Move" : "Link";
  const actionIcon = mode === "copy" ? "📋" : mode === "move" ? "✂️" : "🔗";

  const positionLabel =
    position === "start"
      ? "First on page"
      : position === "above"
        ? `Above #${(selectedIdx ?? 0) + 1} — ${targetComponents[selectedIdx!]?.name ?? ""}`
        : `Below #${(selectedIdx ?? 0) + 1} — ${targetComponents[selectedIdx!]?.name ?? ""}`;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "white", borderRadius: 12,
        width: 600, maxWidth: "95vw", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, flex: 1 }}>
              {actionIcon} {actionLabel} component
            </h3>
            <button className="btn-icon" onClick={onClose} style={{ fontSize: "1.1rem" }}>✕</button>
          </div>

          {/* Step breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem" }}>
            {(["page", "component", "save"] as Step[]).map((s, i) => {
              const isActive = step === s;
              const isClickable =
                (s === "page" && step !== "page") ||
                (s === "component" && step === "save");
              return (
                <span key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <span style={{ color: "var(--text-muted)" }}>›</span>}
                  <button
                    onClick={() => {
                      if (s === "page" && step !== "page") {
                        setStep("page");
                        setTargetPage(null);
                        setSelectedIdx(null);
                        setPosition(null);
                      }
                      if (s === "component" && step === "save") {
                        setStep("component");
                        setSelectedIdx(null);
                        setPosition(null);
                      }
                    }}
                    style={{
                      background: "none", border: "none",
                      padding: "2px 8px", borderRadius: 4,
                      cursor: isClickable ? "pointer" : "default",
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? "var(--primary)" : isClickable ? "var(--text)" : "var(--text-muted)",
                      fontSize: "0.78rem",
                      textDecoration: isClickable ? "underline" : "none",
                    }}
                  >
                    {s === "page" ? "Page" : s === "component" ? "Component" : "Save"}
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

          {/* Step 1 — Page selection */}
          {step === "page" && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <input
                  className="form-control"
                  placeholder="Search pages…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {pagesLoading ? (
                <div className="empty-state"><p>Loading pages…</p></div>
              ) : filteredPages.length === 0 ? (
                <div className="empty-state"><p>No pages found.</p></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {filteredPages.map((page) => {
                    const isSelf = page.id === sourcePageId;
                    const disabledForLink = mode === "link" && isSelf;
                    return (
                      <button
                        key={page.id}
                        onClick={() => !disabledForLink && selectPage(page)}
                        disabled={disabledForLink}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px", borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: disabledForLink ? "var(--bg-muted, #f9fafb)" : "var(--bg-light)",
                          cursor: disabledForLink ? "not-allowed" : "pointer",
                          textAlign: "left",
                          width: "100%",
                          opacity: disabledForLink ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!disabledForLink) {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.background = "#eff6ff";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!disabledForLink) {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.background = "var(--bg-light)";
                          }
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{page.title}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            {page.permalink}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                          {isSelf && (
                            <span style={{
                              fontSize: "0.68rem", background: "#fef9c3", color: "#854d0e",
                              padding: "1px 7px", borderRadius: 999,
                            }}>
                              {mode === "link" ? "source (not allowed)" : "current"}
                            </span>
                          )}
                          {!disabledForLink && (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>›</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Component selection */}
          {step === "component" && (
            <div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 14px" }}>
                Select where to {mode === "copy" ? "copy" : mode === "move" ? "move" : "link"}{" "}
                <strong>{sourceComponentName}</strong> on{" "}
                <strong>{targetPage?.title}</strong>
              </p>

              {structureLoading ? (
                <div className="empty-state"><p>Loading components…</p></div>
              ) : targetComponents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px" }}>
                  <p style={{ color: "var(--text-muted)", marginBottom: 16, fontSize: "0.85rem" }}>
                    This page has no components yet.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => selectPosition(null, "start")}
                  >
                    {actionLabel} to this page
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {targetComponents.map((comp, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-light)",
                      }}
                    >
                      <span style={{
                        fontSize: "0.72rem", fontWeight: 700,
                        color: "var(--text-muted)", minWidth: 26,
                      }}>
                        #{idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{comp.name}</span>
                        {comp.namespace && (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: 8 }}>
                            {comp.namespace}
                          </span>
                        )}
                        {comp.instance.linkedFrom && (
                          <span style={{
                            fontSize: "0.68rem", background: "#ede9fe", color: "#6d28d9",
                            padding: "1px 6px", borderRadius: 999, marginLeft: 8,
                          }}>
                            linked
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: "0.72rem", padding: "3px 10px" }}
                          onClick={() => selectPosition(idx, "above")}
                        >
                          ↑ {actionLabel} above
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: "0.72rem", padding: "3px 10px" }}
                          onClick={() => selectPosition(idx, "below")}
                        >
                          ↓ {actionLabel} below
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Summary + confirm */}
          {step === "save" && (
            <div>
              <div style={{
                background: "var(--bg-light)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "16px 18px", marginBottom: 16,
              }}>
                <p style={{
                  margin: "0 0 12px", fontSize: "0.72rem", fontWeight: 700,
                  color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Summary
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <SummaryRow label="Action" value={actionLabel} />
                  <SummaryRow label="Component" value={sourceComponentName} />
                  <SummaryRow label="From page" value={sourcePageTitle} />
                  <SummaryRow label="To page" value={targetPage?.title ?? ""} />
                  <SummaryRow label="Position" value={positionLabel} />
                </div>
              </div>

              {mode === "move" && (
                <div style={{
                  background: "#fef9c3", border: "1px solid #fde68a",
                  borderRadius: 8, padding: "10px 14px",
                  fontSize: "0.8rem", color: "#854d0e", marginBottom: 16,
                }}>
                  ⚠️ Moving will remove the component from <strong>{sourcePageTitle}</strong> and
                  save a new version on both pages.
                </div>
              )}

              {mode === "link" && (
                <div style={{
                  background: "#ede9fe", border: "1px solid #c4b5fd",
                  borderRadius: 8, padding: "10px 14px",
                  fontSize: "0.8rem", color: "#5b21b6", marginBottom: 16,
                }}>
                  🔗 The component on <strong>{targetPage?.title}</strong> will always reflect changes
                  made to the original on <strong>{sourcePageTitle}</strong>. It cannot be edited
                  independently.
                </div>
              )}

              {error && (
                <div style={{
                  background: "#fee2e2", border: "1px solid #fca5a5",
                  borderRadius: 8, padding: "10px 14px",
                  fontSize: "0.8rem", color: "#991b1b", marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={confirm}
                  disabled={saving}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {saving && (
                    <span style={{
                      width: 12, height: 12, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "white", display: "inline-block",
                      animation: "cms-spin 0.7s linear infinite",
                    }} />
                  )}
                  {saving ? "Saving…" : `Confirm ${actionLabel}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{
        fontSize: "0.78rem", color: "var(--text-muted)",
        minWidth: 84, paddingTop: 1, flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
