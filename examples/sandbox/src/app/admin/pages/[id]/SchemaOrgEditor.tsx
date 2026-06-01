"use client";

import { useState } from "react";

// ── Schema type definitions ────────────────────────────────────────────────────
const SCHEMA_TYPES = [
  {
    type: "WebPage",
    icon: "🌐",
    label: "Web Page",
    fields: [
      { key: "name",        label: "Page name",    type: "text" },
      { key: "description", label: "Description",  type: "textarea" },
      { key: "url",         label: "URL",          type: "text", hint: "Leave blank to use page URL" },
    ],
  },
  {
    type: "Organization",
    icon: "🏢",
    label: "Organization",
    fields: [
      { key: "name",       label: "Name",         type: "text" },
      { key: "url",        label: "Website URL",  type: "text" },
      { key: "logo",       label: "Logo URL",     type: "text" },
      { key: "email",      label: "Email",        type: "text" },
      { key: "telephone",  label: "Phone",        type: "text" },
      { key: "sameAs",     label: "Social profiles (one per line)", type: "textarea",
        hint: "https://linkedin.com/...\nhttps://twitter.com/..." },
    ],
  },
  {
    type: "Article",
    icon: "📰",
    label: "Article",
    fields: [
      { key: "headline",      label: "Headline",         type: "text" },
      { key: "author",        label: "Author name",      type: "text" },
      { key: "datePublished", label: "Published date",   type: "text", hint: "ISO 8601 e.g. 2024-01-15" },
      { key: "dateModified",  label: "Modified date",    type: "text" },
      { key: "image",         label: "Featured image URL", type: "text" },
    ],
  },
  {
    type: "FAQPage",
    icon: "❓",
    label: "FAQ Page",
    fields: [],  // dynamic Q&A list, handled separately
    hasFaqs: true,
  },
  {
    type: "BreadcrumbList",
    icon: "🧭",
    label: "Breadcrumb",
    fields: [],
    note: "Auto-generated from page hierarchy (CR-003)",
  },
  {
    type: "Product",
    icon: "🛒",
    label: "Product",
    fields: [
      { key: "name",        label: "Product name",   type: "text" },
      { key: "description", label: "Description",    type: "textarea" },
      { key: "image",       label: "Image URL",      type: "text" },
      { key: "price",       label: "Price",          type: "text", hint: "e.g. 29.99" },
      { key: "currency",    label: "Currency",       type: "text", hint: "e.g. EUR" },
      { key: "availability",label: "Availability",   type: "text", hint: "InStock / OutOfStock" },
    ],
  },
  {
    type: "LocalBusiness",
    icon: "📍",
    label: "Local Business",
    fields: [
      { key: "name",            label: "Business name",    type: "text" },
      { key: "address",         label: "Street address",   type: "text" },
      { key: "addressLocality", label: "City",             type: "text" },
      { key: "addressCountry",  label: "Country code",     type: "text", hint: "e.g. IT" },
      { key: "telephone",       label: "Phone",            type: "text" },
      { key: "openingHours",    label: "Opening hours",    type: "text", hint: "e.g. Mo-Fr 09:00-18:00" },
    ],
  },
  {
    type: "Event",
    icon: "📅",
    label: "Event",
    fields: [
      { key: "name",       label: "Event name",    type: "text" },
      { key: "startDate",  label: "Start date",    type: "text", hint: "ISO 8601" },
      { key: "endDate",    label: "End date",      type: "text", hint: "ISO 8601" },
      { key: "location",   label: "Location name", type: "text" },
      { key: "url",        label: "Event URL",     type: "text" },
      { key: "image",      label: "Image URL",     type: "text" },
    ],
  },
] as const;

type SchemaTypeDef = typeof SCHEMA_TYPES[number];
type SchemaBlock = {
  type:    string;
  enabled: boolean;
  data:    Record<string, string>;
  faqs?:   { question: string; answer: string }[];
};

// ── Component ─────────────────────────────────────────────────────────────────
export function SchemaOrgEditor({ pageId }: { pageId: string }) {
  const [selectedType, setSelectedType] = useState<string>(SCHEMA_TYPES[0].type);
  const [blocks,        setBlocks]       = useState<Record<string, SchemaBlock>>({});

  function getBlock(type: string): SchemaBlock {
    return blocks[type] ?? { type, enabled: false, data: {}, faqs: [] };
  }

  function updateField(type: string, key: string, value: string) {
    setBlocks((prev) => ({
      ...prev,
      [type]: { ...getBlock(type), data: { ...getBlock(type).data, [key]: value } },
    }));
  }

  function toggleEnabled(type: string) {
    setBlocks((prev) => ({
      ...prev,
      [type]: { ...getBlock(type), enabled: !getBlock(type).enabled },
    }));
  }

  function addFaq(type: string) {
    const b = getBlock(type);
    setBlocks((prev) => ({
      ...prev,
      [type]: { ...b, faqs: [...(b.faqs ?? []), { question: "", answer: "" }] },
    }));
  }

  function updateFaq(type: string, idx: number, key: "question" | "answer", value: string) {
    const b = getBlock(type);
    const faqs = [...(b.faqs ?? [])];
    faqs[idx] = { ...faqs[idx], [key]: value };
    setBlocks((prev) => ({ ...prev, [type]: { ...b, faqs } }));
  }

  function removeFaq(type: string, idx: number) {
    const b = getBlock(type);
    setBlocks((prev) => ({
      ...prev,
      [type]: { ...b, faqs: (b.faqs ?? []).filter((_, i) => i !== idx) },
    }));
  }

  const activeDef = SCHEMA_TYPES.find((t) => t.type === selectedType);
  const activeBlock = getBlock(selectedType);

  return (
    <div style={{ marginTop: 32, borderTop: "2px solid var(--border)", paddingTop: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Schema.org / JSON-LD</h2>
        <span style={{ fontSize: "0.72rem", background: "#fef9c3", color: "#854d0e",
          padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
          CR-003 — engine support pending
        </span>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>
        Configure structured data for this page. The CMS engine will inject{" "}
        <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>
          {"<script type=\"application/ld+json\">"}
        </code>{" "}
        in the page head once CR-003 is implemented.
      </p>

      {/* Two-panel layout */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 0,
        border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>

        {/* Left: type selector */}
        <div style={{ background: "var(--bg-light)", borderRight: "1px solid var(--border)" }}>
          {SCHEMA_TYPES.map((t) => {
            const block    = getBlock(t.type);
            const isActive = selectedType === t.type;
            return (
              <div
                key={t.type}
                onClick={() => setSelectedType(t.type)}
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         8,
                  padding:     "10px 14px",
                  cursor:      "pointer",
                  borderBottom: "1px solid var(--border)",
                  background:  isActive ? "white" : "transparent",
                  borderRight: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                  transition:  "all 0.12s",
                }}
              >
                <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                <span style={{ flex: 1, fontSize: "0.83rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--primary)" : "var(--text-muted)" }}>
                  {t.label}
                </span>
                {block.enabled && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%",
                    background: "var(--success)", flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Right: form for selected type */}
        <div style={{ padding: 20, background: "white" }}>
          {activeDef && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: "1.4rem" }}>{activeDef.icon}</span>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{activeDef.label}</h3>
                <label style={{ marginLeft: "auto", display: "flex", alignItems: "center",
                  gap: 7, cursor: "pointer", fontSize: "0.85rem" }}>
                  <input type="checkbox" checked={activeBlock.enabled}
                    onChange={() => toggleEnabled(selectedType)} />
                  Enable on this page
                </label>
              </div>

              {/* Note for auto-generated types */}
              {"note" in activeDef && activeDef.note && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a",
                  borderRadius: 6, padding: "10px 14px", fontSize: "0.82rem", color: "#78350f" }}>
                  ⚠️ {activeDef.note}
                </div>
              )}

              {/* Standard fields */}
              {"fields" in activeDef && activeDef.fields.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {activeDef.fields.map((field) => (
                    <div key={field.key} className="form-group">
                      <label className="form-label">{field.label}</label>
                      {"hint" in field && field.hint && (
                        <span className="form-hint" style={{ display: "block", marginBottom: 3 }}>
                          {field.hint}
                        </span>
                      )}
                      {field.type === "textarea" ? (
                        <textarea className="form-control" rows={3}
                          value={activeBlock.data[field.key] ?? ""}
                          onChange={(e) => updateField(selectedType, field.key, e.target.value)} />
                      ) : (
                        <input type="text" className="form-control"
                          value={activeBlock.data[field.key] ?? ""}
                          onChange={(e) => updateField(selectedType, field.key, e.target.value)} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* FAQ list */}
              {"hasFaqs" in activeDef && activeDef.hasFaqs && (
                <div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 12 }}>
                    Add question/answer pairs. Each will become an{" "}
                    <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>
                      AcceptedAnswer
                    </code>{" "}
                    entry in the FAQPage schema.
                  </p>
                  {(activeBlock.faqs ?? []).map((faq, idx) => (
                    <div key={idx} style={{ border: "1px solid var(--border)", borderRadius: 8,
                      padding: "12px 14px", marginBottom: 10 }}>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Question</label>
                        <input className="form-control" value={faq.question}
                          onChange={(e) => updateFaq(selectedType, idx, "question", e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Answer</label>
                        <textarea className="form-control" rows={2} value={faq.answer}
                          onChange={(e) => updateFaq(selectedType, idx, "answer", e.target.value)} />
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm"
                        style={{ marginTop: 6, color: "var(--danger)" }}
                        onClick={() => removeFaq(selectedType, idx)}>
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={() => addFaq(selectedType)}>
                    + Add question
                  </button>
                </div>
              )}

              {/* JSON preview */}
              {activeBlock.enabled && (
                <details style={{ marginTop: 16 }}>
                  <summary style={{ fontSize: "0.8rem", color: "var(--text-muted)",
                    cursor: "pointer", userSelect: "none" }}>
                    Preview JSON-LD
                  </summary>
                  <pre style={{ background: "#f8fafc", border: "1px solid var(--border)",
                    borderRadius: 6, padding: 12, fontSize: "0.75rem", marginTop: 8,
                    overflowX: "auto", whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(
                      {
                        "@context": "https://schema.org",
                        "@type":    selectedType,
                        ...Object.fromEntries(
                          Object.entries(activeBlock.data).filter(([, v]) => v?.trim())
                        ),
                        ...("hasFaqs" in activeDef && activeDef.hasFaqs && (activeBlock.faqs ?? []).length > 0
                          ? {
                              mainEntity: (activeBlock.faqs ?? []).map((f) => ({
                                "@type":          "Question",
                                name:             f.question,
                                acceptedAnswer:   { "@type": "Answer", text: f.answer },
                              })),
                            }
                          : {}),
                      },
                      null, 2
                    )}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
