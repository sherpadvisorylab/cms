"use client";

import { useState, useTransition } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { CmsSettings } from "@cms/domain";
import { saveBranding, saveAuthentication, saveSystemVars } from "./actions";
import { ImageUploadField, getImageUrl, type ImageValue } from "@/components/admin/ImageUploadField";

// ── Built-in style variable keys (must match CMS engine defaults) ─────────────
const BUILTIN_STYLE_VARS = [
  "bg-primary", "bg-secondary", "bg-accent", "bg-surface",
  "text-primary", "text-secondary", "text-muted", "text-accent",
  "border-primary", "border-secondary", "border-muted",
];

type Tab = "branding" | "auth" | "systemvars" | "backup";

const TAB_LABELS: Record<Tab, string> = {
  branding:   "Branding & defaults",
  auth:       "Authentication",
  systemvars: "System variables",
  backup:     "Backup",
};

// ── Utility: "not supported" banner ──────────────────────────────────────────
function UnsupportedNote({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      background: "#fffbeb", border: "1px solid #fde68a",
      borderRadius: 8, padding: "12px 14px", fontSize: "0.82rem", color: "#78350f",
    }}>
      <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
      <span>{message}</span>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────
export function SettingsClient({ initialSettings }: { initialSettings: CmsSettings | null }) {
  const [tab, setTab] = useState<Tab>("branding");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const s = initialSettings;

  // Image URLs — controlled state so ImageUploadField can update them
  const [logoLight, setLogoLight] = useState<ImageValue>((s?.branding as any)?.logoLight ?? "");
  const [logoDark,  setLogoDark]  = useState<ImageValue>((s?.branding as any)?.logoDark  ?? "");
  const [favicon,   setFavicon]   = useState<ImageValue>((s?.branding as any)?.favicon   ?? "");

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
        actions={saved ? (
          <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>
        ) : undefined}
        tabs={(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      />

      {/* ── Branding ─────────────────────────────────────────────────────────── */}
      {tab === "branding" && (
        <form action={onSave(saveBranding)}>
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 18 }}>
              Default values used by the public site and auth pages when no area-level override is set.
            </p>

            {/* General */}
            <div className="form-row" style={{ marginBottom: 18 }}>
              <div className="form-group">
                <label className="form-label">Project name</label>
                <input name="projectName" className="form-control" defaultValue={(s?.branding as any)?.projectName ?? ""} placeholder="e.g. My Platform" />
              </div>
              <div className="form-group">
                <label className="form-label">Default language</label>
                <select name="defaultLanguage" className="form-control" defaultValue={(s?.branding as any)?.defaultLanguage ?? "en"}>
                  <option value="en">English</option>
                  <option value="it">Italiano</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Default timezone (IANA)</label>
                <select name="defaultTimezone" className="form-control" defaultValue={(s?.branding as any)?.defaultTimezone ?? "UTC"}>
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

            {/* Logos + favicon — upload to Supabase Storage (cms-assets bucket) */}
            <input type="hidden" name="logoLight" value={getImageUrl(logoLight)} />
            <input type="hidden" name="logoDark"  value={getImageUrl(logoDark)}  />
            <input type="hidden" name="favicon"   value={getImageUrl(favicon)}   />
            <div style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ marginBottom: 12, display: "block" }}>Logos & Favicon</label>
              <div className="form-row" style={{ alignItems: "flex-start" }}>
                <div className="form-group">
                  <ImageUploadField
                    label="☀️ Logo light"
                    value={logoLight}
                    onChange={setLogoLight}
                    hint="Displayed on light backgrounds"
                  />
                </div>
                <div className="form-group">
                  <ImageUploadField
                    label="🌙 Logo dark"
                    value={logoDark}
                    onChange={setLogoDark}
                    dark
                    hint="Displayed on dark backgrounds"
                  />
                </div>
                <div className="form-group">
                  <ImageUploadField
                    label="Favicon"
                    value={favicon}
                    onChange={setFavicon}
                    hint="Recommended: .svg or .png 32×32"
                  />
                </div>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6 }}>
                Files are uploaded to the <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>cms-assets</code> Supabase Storage bucket.
                The CMS stores only the public URL.
              </p>
            </div>

            {/* Fonts */}
            <div className="form-row" style={{ marginBottom: 18 }}>
              <div className="form-group">
                <label className="form-label">Default font (CSS URL)</label>
                <input name="defaultFont" className="form-control" defaultValue={(s?.branding as any)?.defaultFont ?? ""} placeholder="https://fonts.googleapis.com/css2?family=Inter" />
                <span className="form-hint">Loaded on every page via &lt;link&gt;</span>
              </div>
              <div className="form-group">
                <label className="form-label">Default icon font (CSS URL)</label>
                <input name="defaultIconFont" className="form-control" defaultValue={(s?.branding as any)?.defaultIconFont ?? ""} placeholder="https://cdnjs.cloudflare.com/…/font-awesome.min.css" />
                <span className="form-hint">e.g. Font Awesome, Material Icons</span>
              </div>
            </div>

            {/* Email defaults */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginBottom: 2 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                ✉️ Email defaults
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sender name</label>
                  <input name="senderName" className="form-control" defaultValue={(s?.emailDefaults as any)?.senderName ?? ""} placeholder="No Reply" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sender email (from)</label>
                  <input name="senderEmail" className="form-control" type="email" defaultValue={(s?.emailDefaults as any)?.senderEmail ?? ""} placeholder="no-reply@example.com" />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Saving…" : "💾 Save branding"}
          </button>
        </form>
      )}

      {/* ── Authentication ────────────────────────────────────────────────────── */}
      {tab === "auth" && (
        <form action={onSave(saveAuthentication)}>
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
              Controls whether SSO options appear on the Login and Signup pages.
              SSO providers are configured in your auth layer (Supabase) — the CMS does not manage provider credentials.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                name="ssoEnabled"
                defaultChecked={(s?.authentication as any)?.ssoEnabled ?? false}
              />
              Enable SSO on Login and Signup
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Saving…" : "💾 Save"}
          </button>
        </form>
      )}

      {/* ── System variables ──────────────────────────────────────────────────── */}
      {tab === "systemvars" && (
        <SystemVarsTab settings={s} onSaved={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} />
      )}

      {/* ── Backup ────────────────────────────────────────────────────────────── */}
      {tab === "backup" && (
        <div className="card">
          <UnsupportedNote message="Backup is not managed by the CMS engine. Use your Supabase dashboard → Database → Backups for point-in-time recovery and scheduled exports." />
          <div style={{ marginTop: 20, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 10px" }}><strong>What Supabase provides:</strong></p>
            <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
              <li>Daily automatic backups (paid plans)</li>
              <li>Point-in-time recovery (Pro plan)</li>
              <li>Manual export via <code style={{ background: "#f1f5f9", padding: "0 4px", borderRadius: 3 }}>pg_dump</code></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── System Variables tab (needs its own state for dynamic custom vars) ────────
function SystemVarsTab({
  settings,
  onSaved,
}: {
  settings: CmsSettings | null;
  onSaved: () => void;
}) {
  const defaults = (settings?.systemVariableDefaults ?? {}) as Record<string, string>;
  const customKeys = (settings?.customVariableKeys ?? []) as string[];

  const [builtinVals, setBuiltinVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(BUILTIN_STYLE_VARS.map((k) => [k, defaults[k] ?? k]))
  );
  const [customRows, setCustomRows] = useState<{ key: string; value: string }[]>(() =>
    customKeys.map((k) => ({ key: k, value: defaults[k] ?? "" }))
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const merged: Record<string, string> = { ...builtinVals };
    customRows.forEach((r) => { if (r.key.trim()) merged[r.key.trim()] = r.value; });
    await saveSystemVars({
      defaults: merged,
      customKeys: customRows.filter((r) => r.key.trim()).map((r) => r.key.trim()),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
        Default values resolved when no area-level override is set.
        Use <code style={{ background: "#f1f5f9", padding: "0 3px", borderRadius: 3 }}>{"{{variable-key}}"}</code> in components — built-in and custom variables appear in the context menu of the template editor.
      </p>

      {/* Built-in style vars */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 14 }}>
          🎨 Style variables (color / context)
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 14, marginTop: -8 }}>
          Tailwind class names or hex values. Used for theme consistency across areas and components.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px 18px" }}>
          {BUILTIN_STYLE_VARS.map((key) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 500, fontFamily: "monospace", color: "var(--primary)" }}>{key}</label>
              <input
                className="form-control"
                style={{ fontSize: "0.82rem" }}
                value={builtinVals[key] ?? key}
                onChange={(e) => setBuiltinVals({ ...builtinVals, [key]: e.target.value })}
                placeholder={key}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Custom variables */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 14 }}>
          ➕ Custom variables
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 14, marginTop: -8 }}>
          Add your own keys (e.g. <code style={{ background: "#f1f5f9", padding: "0 2px", borderRadius: 3 }}>hero-title-size</code>, <code style={{ background: "#f1f5f9", padding: "0 2px", borderRadius: 3 }}>footer-bg</code>).
          They appear in the variables popup when editing components.
        </p>
        {customRows.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {customRows.map((row, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="form-control"
                  style={{ width: 160, fontFamily: "monospace", fontSize: "0.82rem" }}
                  value={row.key}
                  placeholder="key"
                  onChange={(e) => setCustomRows(customRows.map((r, i) => i === idx ? { ...r, key: e.target.value.replace(/\s+/g, "-").toLowerCase() } : r))}
                />
                <input
                  className="form-control"
                  style={{ flex: 1, fontSize: "0.82rem" }}
                  value={row.value}
                  placeholder="value"
                  onChange={(e) => setCustomRows(customRows.map((r, i) => i === idx ? { ...r, value: e.target.value } : r))}
                />
                <button
                  className="btn-icon"
                  style={{ color: "var(--danger)" }}
                  onClick={() => setCustomRows(customRows.filter((_, i) => i !== idx))}
                  type="button"
                >✕</button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setCustomRows([...customRows, { key: "", value: "" }])}
        >
          + Add variable
        </button>
      </div>

      {/* Forms note */}
      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "12px 14px", borderTop: "1px solid var(--border)", marginBottom: 20 }}>
        <strong>Form (embed)</strong> — Form list is built from CMS forms. Use{" "}
        <code style={{ background: "#f1f5f9", padding: "0 4px", borderRadius: 3 }}>{"{{form:variable}}"}</code>
        {" "}in components. Manage forms in <a href="/admin/forms" style={{ color: "var(--primary)" }}>Forms →</a>
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
        {saving ? "Saving…" : "💾 Save system variables"}
      </button>
    </div>
  );
}
