"use client";

import { useState, useEffect, useRef } from "react";
import { CodeEditor } from "@/components/admin/CodeEditor";
import type { LocalVar } from "@/components/admin/CodeEditor";
import { savePageSchemaConfig } from "../actions";

export interface ComponentSchemaEntry {
  instanceIndex:     number;
  componentId:       string;
  componentName:     string;
  namespace:         string | null;
  schemaOrgTemplate: string;
  fields:            LocalVar[];
}

export interface PageSchemaConfig {
  enabledIndices: number[];
  manualEnabled:  boolean;
  manualTemplate: string;
}

interface Props {
  pageId:      string;
  components:  ComponentSchemaEntry[];
  savedConfig: PageSchemaConfig | null;
}

export function PageSchemaEditor({ pageId, components, savedConfig }: Props) {
  const [enabledSet,    setEnabledSet]    = useState<Set<number>>(
    new Set(savedConfig?.enabledIndices ?? [])
  );
  const [manualEnabled, setManualEnabled] = useState(savedConfig?.manualEnabled ?? false);
  const [manualTemplate,setManualTemplate]= useState(savedConfig?.manualTemplate ?? "");
  const [selected,      setSelected]      = useState<number | "manual">(0);
  const [saving,        setSaving]        = useState(false);
  const [savedFlash,    setSavedFlash]    = useState(false);

  // Use a ref so the event listener always has fresh state
  const saveRef = useRef<() => Promise<void>>(async () => {});

  async function handleSave() {
    setSaving(true);
    await savePageSchemaConfig(pageId, {
      enabledIndices: [...enabledSet],
      manualEnabled,
      manualTemplate,
    });
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  }

  // Keep saveRef current so the event listener always calls the latest version
  useEffect(() => { saveRef.current = handleSave; });

  // Listen for the global "cms:save-page-schema" event dispatched by PageSettingsSaveButton
  useEffect(() => {
    function handler() { saveRef.current(); }
    window.addEventListener("cms:save-page-schema", handler);
    return () => window.removeEventListener("cms:save-page-schema", handler);
  }, []);

  function toggleComp(i: number, e: React.MouseEvent) {
    e.stopPropagation();
    setEnabledSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  // Variable context: all fields from all components (for Manual),
  // or just the selected component's fields.
  const allPageVars: LocalVar[] = components.flatMap((comp) =>
    comp.fields.map((f) => ({
      key:   f.key,
      label: `${f.label} — ${comp.componentName}${comp.instanceIndex > 0 ? ` #${comp.instanceIndex + 1}` : ""}`,
      type:  f.type,
    }))
  );

  const globalVars: LocalVar[] = [
    { key: "page.title", label: "Page title",       type: "text" },
    { key: "page.slug",  label: "Page slug",         type: "text" },
    { key: "site.name",  label: "Site name",         type: "text" },
    { key: "area.name",  label: "Area name",         type: "text" },
  ];

  const selectedComp  = selected !== "manual" ? (components[selected] ?? null) : null;
  const editorVars    = selected === "manual"
    ? [...allPageVars, ...globalVars]
    : [...(selectedComp?.fields ?? []), ...globalVars];

  return (
    <div style={{ marginTop: 32, borderTop: "2px solid var(--border)", paddingTop: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Schema.org / JSON-LD</h2>
        {savedFlash && (
          <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600, marginLeft: "auto" }}>✓ Schema saved</span>
        )}
      </div>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        background: "#fffbeb", border: "1px solid #fde68a",
        borderRadius: 6, padding: "10px 14px", marginBottom: 16,
      }}>
        <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <div>
          <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#78350f" }}>
            CR-003 — Engine support pending
          </span>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#92400e" }}>
            Enabled schemas will be injected as{" "}
            <code style={{ background: "#fef3c7", padding: "0 3px", borderRadius: 3 }}>
              {"<script type=\"application/ld+json\">"}
            </code>{" "}
            in the page head once CR-003 is implemented. Multiple enabled entries are merged into a single JSON-LD array.
          </p>
        </div>
      </div>

      {/* Two-panel layout */}
      <div style={{
        display: "grid", gridTemplateColumns: "220px 1fr",
        border: "1px solid var(--border)", borderRadius: 8,
        overflow: "hidden", minHeight: 480,
      }}>
        {/* ── Left: component list ───────────────────────────────────────────── */}
        <div style={{
          background: "var(--bg-light)", borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
        }}>
          {components.length === 0 && (
            <div style={{ padding: 16, fontSize: "0.82rem", color: "var(--text-muted)" }}>
              No components on this page yet.
            </div>
          )}

          {components.map((comp, i) => {
            const isActive   = selected === i;
            const isEnabled  = enabledSet.has(i);
            return (
              <div
                key={i}
                onClick={() => setSelected(i)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                  background:  isActive ? "white" : "transparent",
                  borderRight: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                  transition:  "background 0.1s",
                }}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => {}}
                  onClick={(e) => toggleComp(i, e)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.83rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--primary)" : "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {comp.componentName}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 1 }}>
                    #{comp.instanceIndex + 1}
                    {comp.namespace ? ` · ${comp.namespace}` : ""}
                    {!comp.schemaOrgTemplate && (
                      <span style={{ color: "#d97706", marginLeft: 4 }}>no template</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Manual entry — always last */}
          <div
            onClick={() => setSelected("manual")}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 14px", cursor: "pointer",
              borderBottom: "1px solid var(--border)",
              background:  selected === "manual" ? "white" : "transparent",
              borderRight: selected === "manual" ? "2px solid var(--primary)" : "2px solid transparent",
              transition:  "background 0.1s",
            }}
          >
            <input
              type="checkbox"
              checked={manualEnabled}
              onChange={() => {}}
              onClick={(e) => { e.stopPropagation(); setManualEnabled((v) => !v); }}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: "0.83rem",
                fontWeight: selected === "manual" ? 600 : 400,
                color:     selected === "manual" ? "var(--primary)" : "var(--text)",
              }}>
                Manual
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 1 }}>
                Custom JSON-LD Liquid template
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: editor ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", background: "white" }}>
          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderBottom: "1px solid var(--border)",
            background: "var(--bg-light)", flexShrink: 0,
          }}>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              {selected === "manual"
                ? "Manual — Custom JSON-LD"
                : `${selectedComp?.componentName ?? ""} — Schema Template`}
            </span>
            {selected !== "manual" && selectedComp && (
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                (read-only · edit template in the Component editor)
              </span>
            )}
            {selected !== "manual" && selectedComp && !selectedComp.schemaOrgTemplate && (
              <span style={{
                fontSize: "0.72rem", background: "#fef3c7", color: "#92400e",
                padding: "1px 6px", borderRadius: 4,
              }}>
                No template defined
              </span>
            )}
          </div>

          {/* Editor area */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {selected === "manual" ? (
              <CodeEditor
                value={manualTemplate}
                onChange={setManualTemplate}
                language="html"
                localVars={editorVars}
                hideComponentEmbeds
                minHeight={420}
              />
            ) : (
              /* Component schema template — read-only display */
              <div style={{ height: "100%", overflowY: "auto" }}>
                {selectedComp?.schemaOrgTemplate ? (
                  <CodeEditor
                    value={selectedComp.schemaOrgTemplate}
                    onChange={() => {}}
                    language="html"
                    localVars={editorVars}
                    hideComponentEmbeds
                    minHeight={420}
                  />
                ) : (
                  <div style={{
                    padding: 24, fontSize: "0.85rem", color: "var(--text-muted)",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <p style={{ margin: 0 }}>
                      No schema template defined for this component.
                    </p>
                    <p style={{ margin: 0, fontSize: "0.78rem" }}>
                      Open the Component editor → Schema tab to add a JSON-LD Liquid template.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
