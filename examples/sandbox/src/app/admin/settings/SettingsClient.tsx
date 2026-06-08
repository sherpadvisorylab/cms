"use client";

import { useState, useTransition } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type {
  CmsSettings,
  CmsVariableDefinition,
  CmsVariableNamespace,
  CmsVariableType,
} from "@sherpacms/domain";
import { saveBranding, saveAuthentication, saveSystemVars } from "./actions";
import { ImageUploadField, getImageUrl, type ImageValue } from "@/components/admin/ImageUploadField";
import { BUILT_IN_STYLE_VARIABLES, mergeSettingVariables } from "@/lib/variables/registry";

type Tab = "branding" | "auth" | "systemvars" | "backup";
type EditableVariableRow = CmsVariableDefinition & { id: string };

const TAB_LABELS: Record<Tab, string> = {
  branding: "Branding & defaults",
  auth: "Authentication",
  systemvars: "System variables",
  backup: "Backup",
};

const VARIABLE_TYPE_OPTIONS: Array<{ value: CmsVariableType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "url", label: "URL" },
  { value: "image", label: "Image URL" },
  { value: "select", label: "Selectable options" },
];

function UnsupportedNote({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 8,
        padding: "12px 14px",
        fontSize: "0.82rem",
        color: "#78350f",
      }}
    >
      <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
      <span>{message}</span>
    </div>
  );
}

function toEditableRow(variable: CmsVariableDefinition, index: number): EditableVariableRow {
  return {
    ...variable,
    id: `${variable.namespace}.${variable.key}.${index}`,
  };
}

function parseOptions(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...rest] = line.split("|");
      const normalizedValue = value.trim();
      const label = rest.join("|").trim() || normalizedValue;
      return { value: normalizedValue, label };
    });
}

function formatOptions(options?: Array<{ label: string; value: string }>) {
  return (options ?? []).map((option) => `${option.value}|${option.label}`).join("\n");
}

function normalizeVariableKey(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part, index) => index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

export function SettingsClient({ initialSettings }: { initialSettings: CmsSettings | null }) {
  const [tab, setTab] = useState<Tab>("branding");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const settings = initialSettings;
  const [logoLight, setLogoLight] = useState<ImageValue>((settings?.branding as any)?.logoLight ?? "");
  const [logoDark, setLogoDark] = useState<ImageValue>((settings?.branding as any)?.logoDark ?? "");
  const [favicon, setFavicon] = useState<ImageValue>((settings?.branding as any)?.favicon ?? "");

  function onSave(action: (fd: FormData) => Promise<void>) {
    return async (fd: FormData) => {
      startTransition(async () => {
        await action(fd);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      });
    };
  }

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        subtitle="Platform-wide configuration. Area-level settings override these defaults."
        actions={
          saved ? (
            <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>
          ) : undefined
        }
        tabs={(Object.keys(TAB_LABELS) as Tab[]).map((tabKey) => (
          <button key={tabKey} className={`tab ${tab === tabKey ? "active" : ""}`} onClick={() => setTab(tabKey)}>
            {TAB_LABELS[tabKey]}
          </button>
        ))}
      />

      {tab === "branding" && (
        <form action={onSave(saveBranding)}>
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 18 }}>
              Default values used by the public site and auth pages when no area-level override is set.
            </p>

            <div className="form-row" style={{ marginBottom: 18 }}>
              <div className="form-group">
                <label className="form-label">Project name</label>
                <input name="projectName" className="form-control" defaultValue={(settings?.branding as any)?.projectName ?? ""} placeholder="e.g. My Platform" />
              </div>
              <div className="form-group">
                <label className="form-label">Site URL</label>
                <input name="siteUrl" className="form-control" defaultValue={(settings?.branding as any)?.siteUrl ?? ""} placeholder="https://example.com" />
                <span className="form-hint">Used to generate canonical URLs and site.permalink.</span>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: 18 }}>
              <div className="form-group">
                <label className="form-label">Default language</label>
                <select name="defaultLanguage" className="form-control" defaultValue={(settings?.branding as any)?.defaultLanguage ?? "en"}>
                  <option value="en">English</option>
                  <option value="it">Italiano</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Default timezone (IANA)</label>
                <select name="defaultTimezone" className="form-control" defaultValue={(settings?.branding as any)?.defaultTimezone ?? "UTC"}>
                  <option value="UTC">UTC</option>
                  <option value="Europe/Rome">Europe/Rome</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>
            </div>

            <input type="hidden" name="logoLight" value={getImageUrl(logoLight)} />
            <input type="hidden" name="logoDark" value={getImageUrl(logoDark)} />
            <input type="hidden" name="favicon" value={getImageUrl(favicon)} />
            <div style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ marginBottom: 12, display: "block" }}>Logos & Favicon</label>
              <div className="form-row" style={{ alignItems: "flex-start" }}>
                <div className="form-group">
                  <ImageUploadField label="Logo light" value={logoLight} onChange={setLogoLight} hint="Displayed on light backgrounds" />
                </div>
                <div className="form-group">
                  <ImageUploadField label="Logo dark" value={logoDark} onChange={setLogoDark} dark hint="Displayed on dark backgrounds" />
                </div>
                <div className="form-group">
                  <ImageUploadField label="Favicon" value={favicon} onChange={setFavicon} hint="Recommended: .svg or .png 32×32" />
                </div>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: 18 }}>
              <div className="form-group">
                <label className="form-label">Default font (CSS URL)</label>
                <input name="defaultFont" className="form-control" defaultValue={(settings?.branding as any)?.defaultFont ?? ""} placeholder="https://fonts.googleapis.com/css2?family=Inter" />
                <span className="form-hint">Loaded on every page via &lt;link&gt;</span>
              </div>
              <div className="form-group">
                <label className="form-label">Default icon font (CSS URL)</label>
                <input name="defaultIconFont" className="form-control" defaultValue={(settings?.branding as any)?.defaultIconFont ?? ""} placeholder="https://cdnjs.cloudflare.com/.../font-awesome.min.css" />
                <span className="form-hint">e.g. Font Awesome, Material Icons</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginBottom: 2 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Email defaults
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sender name</label>
                  <input name="senderName" className="form-control" defaultValue={(settings?.emailDefaults as any)?.senderName ?? ""} placeholder="No Reply" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sender email (from)</label>
                  <input name="senderEmail" className="form-control" type="email" defaultValue={(settings?.emailDefaults as any)?.senderEmail ?? ""} placeholder="no-reply@example.com" />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Saving..." : "Save branding"}
          </button>
        </form>
      )}

      {tab === "auth" && (
        <form action={onSave(saveAuthentication)}>
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
              Controls whether SSO options appear on the Login and Signup pages.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.9rem" }}>
              <input type="checkbox" name="ssoEnabled" defaultChecked={(settings?.authentication as any)?.ssoEnabled ?? false} />
              Enable SSO on Login and Signup
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      {tab === "systemvars" && (
        <SystemVarsTab
          settings={settings}
          onSaved={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          }}
        />
      )}

      {tab === "backup" && (
        <div className="card">
          <UnsupportedNote message="Backup is not managed by the CMS engine. Use your platform storage/database backup tooling instead." />
        </div>
      )}
    </div>
  );
}

function SystemVarsTab({
  settings,
  onSaved,
}: {
  settings: CmsSettings | null;
  onSaved: () => void;
}) {
  const variables = mergeSettingVariables(settings);
  const [styleRows, setStyleRows] = useState<EditableVariableRow[]>(() =>
    BUILT_IN_STYLE_VARIABLES.map((builtIn, index) => {
      const variable = variables.find((entry) => entry.namespace === "styles" && entry.key === builtIn.key) ?? {
        namespace: "styles" as const,
        key: builtIn.key,
        label: builtIn.label,
        description: builtIn.description,
        type: "text" as const,
        value: builtIn.defaultValue,
      };
      return toEditableRow(variable, index);
    }),
  );
  const [customRows, setCustomRows] = useState<EditableVariableRow[]>(() =>
    variables
      .filter((variable) => !(variable.namespace === "styles" && BUILT_IN_STYLE_VARIABLES.some((builtIn) => builtIn.key === variable.key)))
      .map(toEditableRow),
  );
  const [saving, setSaving] = useState(false);

  function updateStyleRow(id: string, patch: Partial<EditableVariableRow>) {
    setStyleRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function updateCustomRow(id: string, patch: Partial<EditableVariableRow>) {
    setCustomRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addCustomRow() {
    setCustomRows((rows) => [
      ...rows,
      {
        id: `custom.${Date.now()}`,
        namespace: "site",
        key: "",
        label: "",
        description: "",
        type: "text",
        value: "",
        options: [],
      },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    const variablesToSave: CmsVariableDefinition[] = [
      ...styleRows.map(({ id, ...variable }) => ({
        ...variable,
        value: variable.value?.trim() ?? "",
      })),
      ...customRows
        .map(({ id, ...variable }) => ({
          ...variable,
          key: normalizeVariableKey(variable.key),
          label: variable.label.trim() || normalizeVariableKey(variable.key),
          description: variable.description?.trim() || undefined,
          value: variable.type === "select" ? (variable.value?.trim() || undefined) : (variable.value?.trim() || ""),
          options: variable.type === "select" ? (variable.options?.filter((option) => option.value.trim()) ?? []) : undefined,
        }))
        .filter((variable) => variable.key),
    ];

    await saveSystemVars({ variables: variablesToSave });
    setSaving(false);
    onSaved();
  }

  return (
    <div>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
        Global variables are always namespaced. Local component variables stay un-namespaced.
        Use <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{site.name}}"}</code>,
        {" "}
        <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{styles.bgPrimary}}"}</code>,
        {" "}
        <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{page.title}}"}</code>.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 14 }}>
          styles.*
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px 18px" }}>
          {styleRows.map((row) => (
            <div key={row.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 500, fontFamily: "monospace", color: "var(--primary)" }}>
                {`styles.${row.key}`}
              </label>
              <input
                className="form-control"
                style={{ fontSize: "0.82rem" }}
                value={row.value ?? ""}
                onChange={(event) => updateStyleRow(row.id, { value: event.target.value })}
                placeholder={row.key}
              />
              <span className="form-hint">{row.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", margin: 0 }}>
            Custom variables
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addCustomRow}>
            + Add variable
          </button>
        </div>

        {customRows.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>No custom variables yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {customRows.map((row) => (
              <div key={row.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 160px auto", gap: 10, alignItems: "start", marginBottom: 10 }}>
                  <select
                    className="form-control"
                    value={row.namespace}
                    onChange={(event) => updateCustomRow(row.id, { namespace: event.target.value as CmsVariableNamespace })}
                  >
                    <option value="site">site</option>
                    <option value="styles">styles</option>
                  </select>
                  <input
                    className="form-control"
                    value={row.key}
                    placeholder="variableKey"
                    onChange={(event) => updateCustomRow(row.id, { key: normalizeVariableKey(event.target.value) })}
                  />
                  <select
                    className="form-control"
                    value={row.type}
                    onChange={(event) => updateCustomRow(row.id, {
                      type: event.target.value as CmsVariableType,
                      options: event.target.value === "select" ? (row.options ?? []) : undefined,
                    })}
                  >
                    {VARIABLE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => setCustomRows((rows) => rows.filter((entry) => entry.id !== row.id))}>
                    ✕
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input
                    className="form-control"
                    value={row.label}
                    placeholder="Human label"
                    onChange={(event) => updateCustomRow(row.id, { label: event.target.value })}
                  />
                  <input
                    className="form-control"
                    value={row.description ?? ""}
                    placeholder="Description"
                    onChange={(event) => updateCustomRow(row.id, { description: event.target.value })}
                  />
                </div>

                {row.type === "select" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10 }}>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={formatOptions(row.options)}
                      onChange={(event) => updateCustomRow(row.id, { options: parseOptions(event.target.value) })}
                      placeholder={"value|Label\nvalue-2|Label 2"}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Default option</label>
                      <input
                        className="form-control"
                        value={row.value ?? ""}
                        placeholder={(row.options ?? [])[0]?.value ?? "default-value"}
                        onChange={(event) => updateCustomRow(row.id, { value: event.target.value })}
                      />
                      <span className="form-hint">Stored default value rendered for this variable.</span>
                    </div>
                  </div>
                ) : (
                  <input
                    className="form-control"
                    value={row.value ?? ""}
                    placeholder="Default value"
                    onChange={(event) => updateCustomRow(row.id, { value: event.target.value })}
                  />
                )}

                <div style={{ marginTop: 8, fontSize: "0.76rem", color: "var(--text-muted)" }}>
                  Token: <code style={{ background: "#f1f5f9", padding: "0 4px", borderRadius: 3 }}>{`{{${row.namespace}.${row.key || "variableKey"}}}`}</code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "12px 14px", borderTop: "1px solid var(--border)", marginBottom: 20 }}>
        Forms and navigations are embeds, not standard variables:
        {" "}
        <code style={{ background: "#f1f5f9", padding: "0 4px", borderRadius: 3 }}>{"{{form:contact}}"}</code>
        {" "}
        and
        {" "}
        <code style={{ background: "#f1f5f9", padding: "0 4px", borderRadius: 3 }}>{"{{navigation:navbar}}"}</code>.
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
        {saving ? "Saving..." : "Save system variables"}
      </button>
    </div>
  );
}
