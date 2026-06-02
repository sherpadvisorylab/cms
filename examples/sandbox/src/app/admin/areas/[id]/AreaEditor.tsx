"use client";

import { useState, useEffect, useTransition } from "react";
import { AdminEditorHeader } from "@/components/admin/AdminEditorHeader";
import { CodeEditor } from "@/components/admin/CodeEditor";
import { ImageUploadField, type ImageValue } from "@/components/admin/ImageUploadField";
import { saveAreaFull } from "../actions";
import type {
  CmsArea, CmsAreaStyle, CmsAreaDesign, CmsAreaLegal, CmsAreaTracking,
  CmsAreaAccessPolicy, CmsColorSchema, CmsLegalPage, CmsTrackingScript,
} from "@sherpacms/domain";
import type { AutocompleteVar, ComponentEmbed } from "@/components/admin/CodeEditor";

// ── Page-level variables for Design tab editors ───────────────────────────────
// Keys match the actual {{variable}} resolved by renderPage().
// Labels use "page:" prefix to visually group them in the picker.
const HEAD_VARS = [
  { key: "pageTitle",  label: "page: title — SEO page title",        type: "text" },
  { key: "siteName",   label: "page: siteName — area site name",     type: "text" },
  { key: "metaTags",   label: "page: metaTags — SEO meta block",     type: "text" },
  { key: "styles",     label: "page: styles — component + area CSS", type: "text" },
  { key: "scripts",    label: "page: scripts — component + area JS", type: "text" },
];

const BODY_VARS = [
  { key: "content",          label: "page: content — rendered components", type: "text" },
  { key: "trackingScripts",  label: "page: trackingScripts — GA/GTM",      type: "text" },
  { key: "styles",           label: "page: styles — component + area CSS", type: "text" },
  { key: "scripts",          label: "page: scripts — component + area JS", type: "text" },
];

// ── Standard color keys ───────────────────────────────────────────────────────
const COLOR_KEYS = [
  { key: "primary",     label: "Primary" },
  { key: "secondary",   label: "Secondary" },
  { key: "accent",      label: "Accent" },
  { key: "success",     label: "Success" },
  { key: "warning",     label: "Warning" },
  { key: "error",       label: "Error" },
  { key: "info",        label: "Info" },
  { key: "background",  label: "Background" },
  { key: "surface",     label: "Surface" },
  { key: "text",        label: "Text" },
  { key: "text-muted",  label: "Text muted" },
  { key: "border",      label: "Border" },
];

// ── Props ─────────────────────────────────────────────────────────────────────
type AreaHtmlTemplate = { id: string; name: string; html: string };

interface Props {
  area:           CmsArea;
  navigations:    { id: string; name: string }[];
  forms:          { variable: string; name: string }[];
  styleVars:      AutocompleteVar[];
  uiComponents?:  ComponentEmbed[];
  headTemplates?: AreaHtmlTemplate[];
  bodyTemplates?: AreaHtmlTemplate[];
}

type Tab = "basic" | "style" | "design" | "legal" | "tracking" | "access";

const TAB_LABELS: Record<Tab, string> = {
  basic:    "Basic Data",
  style:    "Style",
  design:   "Design",
  legal:    "Legal",
  tracking: "Tracking",
  access:   "Access",
};

// ── Main component ─────────────────────────────────────────────────────────────
export function AreaEditor({ area, navigations, forms, styleVars, uiComponents = [], headTemplates: headTemplatesProp = [], bodyTemplates: bodyTemplatesProp = [] }: Props) {
  const [tab,     setTab]     = useState<Tab>("basic");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [, startTransition]   = useTransition();

  // ── Basic ────────────────────────────────────────────────────────────────────
  const [displayName,  setDisplayName]  = useState(area.displayName  ?? "");
  const [siteName,     setSiteName]     = useState(area.siteName     ?? "");
  const [rootPath,     setRootPath]     = useState(area.rootPath     ?? "/");
  const [description,  setDescription]  = useState(area.description  ?? "");
  const [status,       setStatus]       = useState(area.status       ?? "active");

  // ── Style ────────────────────────────────────────────────────────────────────
  const s = area.style ?? {};
  const [logoLight,   setLogoLight]  = useState<ImageValue>(s.logoLight  ?? "");
  const [logoDark,    setLogoDark]   = useState<ImageValue>(s.logoDark   ?? "");
  const [favicon,     setFavicon]    = useState<ImageValue>(s.favicon    ?? "");
  const [schemas,     setSchemas]    = useState<CmsColorSchema[]>(s.colorSchemas ?? []);
  const [customFonts, setCustomFonts]= useState<{name:string;url:string}[]>(s.customFonts ?? []);
  const [iconFonts,   setIconFonts]  = useState<{name:string;url:string}[]>(s.iconFonts   ?? []);

  // ── Design ───────────────────────────────────────────────────────────────────
  const d = area.design ?? {};
  const [headTemplate, setHeadTemplate] = useState(d.headTemplate ?? "");
  const [bodyTemplate, setBodyTemplate] = useState(d.bodyTemplate ?? "");
  const [areaCss,      setAreaCss]      = useState(d.areaCss      ?? "");
  const [areaJs,       setAreaJs]       = useState(d.areaJs       ?? "");
  const [headDropdown, setHeadDropdown] = useState(false);
  const [bodyDropdown, setBodyDropdown] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!headDropdown && !bodyDropdown) return;
    function close() { setHeadDropdown(false); setBodyDropdown(false); }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [headDropdown, bodyDropdown]);

  const headTemplates = headTemplatesProp;
  const bodyTemplates = bodyTemplatesProp;

  // ── Legal ────────────────────────────────────────────────────────────────────
  const l = area.legal ?? {};
  const [legalPages,       setLegalPages]       = useState<CmsLegalPage[]>(l.pages ?? []);
  const [cookieEnabled,    setCookieEnabled]    = useState(l.cookieBar?.enabled ?? false);
  const [cookieLabel,      setCookieLabel]      = useState(l.cookieBar?.label ?? "Cookie Preferences");
  const [cookieDesc,       setCookieDesc]       = useState(l.cookieBar?.description ?? "");

  // ── Tracking ─────────────────────────────────────────────────────────────────
  const t = area.tracking ?? {};
  const [gaId,           setGaId]           = useState(t.gaId          ?? "");
  const [gaPosition,     setGaPosition]     = useState(t.gaPosition    ?? "body-bottom");
  const [gtmId,          setGtmId]          = useState(t.gtmId         ?? "");
  const [gtmPosition,    setGtmPosition]    = useState(t.gtmPosition   ?? "body-top");
  const [customScripts,  setCustomScripts]  = useState<CmsTrackingScript[]>(t.customScripts ?? []);

  // ── Access ───────────────────────────────────────────────────────────────────
  const ac = area.accessPolicy ?? { isRestricted: false };
  const [isRestricted,   setIsRestricted]   = useState(ac.isRestricted   ?? false);
  const [redirectUrl,    setRedirectUrl]    = useState(ac.redirectUrl    ?? "/login");
  const [regEnabled,     setRegEnabled]     = useState(ac.registrationEnabled   ?? true);
  const [regPage,        setRegPage]        = useState(ac.registrationPage      ?? "/register");
  const [recoverEnabled, setRecoverEnabled] = useState(ac.recoverPasswordEnabled ?? true);
  const [recoverPage,    setRecoverPage]    = useState(ac.recoverPasswordPage    ?? "/recover-password");

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    const style: CmsAreaStyle = {
      logoLight:   typeof logoLight === "string" ? logoLight : (logoLight as any)?.url ?? "",
      logoDark:    typeof logoDark  === "string" ? logoDark  : (logoDark  as any)?.url ?? "",
      favicon:     typeof favicon   === "string" ? favicon   : (favicon   as any)?.url ?? "",
      colorSchemas: schemas,
      defaultColorSchemaId: schemas.find((s) => s.isDefault)?.id,
      customFonts,
      iconFonts,
    };
    const design: CmsAreaDesign = { headTemplate, bodyTemplate, areaCss, areaJs };
    const legal: CmsAreaLegal   = {
      pages: legalPages,
      cookieBar: { enabled: cookieEnabled, label: cookieLabel, description: cookieDesc },
    };
    const tracking: CmsAreaTracking = { gaId, gaPosition, gtmId, gtmPosition, customScripts };
    const accessPolicy: CmsAreaAccessPolicy = {
      isRestricted, redirectUrl,
      registrationEnabled: regEnabled, registrationPage: regPage,
      recoverPasswordEnabled: recoverEnabled, recoverPasswordPage: recoverPage,
    };
    startTransition(async () => {
      await saveAreaFull(area.id, { displayName, siteName, rootPath, description, status, style, design, legal, tracking, accessPolicy });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  // ── Color schema helpers ──────────────────────────────────────────────────────
  function addSchema() {
    const id = Date.now();
    const defaults: Record<string,string> = {
      primary:"#2E5A97",secondary:"#283963",accent:"#FFD300",success:"#22C55E",
      warning:"#F59E0B",error:"#EF4444",info:"#3B82F6",background:"#FFFFFF",
      surface:"#F8FAFC",text:"#1E293B","text-muted":"#64748B",border:"#E2E8F0"
    };
    setSchemas([...schemas, { id, name: "New Schema", colors: defaults, isDefault: schemas.length === 0 }]);
  }
  function updateSchema(idx: number, patch: Partial<CmsColorSchema>) {
    setSchemas(schemas.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }
  function setDefault(idx: number) {
    setSchemas(schemas.map((s, i) => ({ ...s, isDefault: i === idx })));
  }
  function removeSchema(idx: number) {
    setSchemas(schemas.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <AdminEditorHeader
        backHref="/admin/areas"
        backLabel="Areas"
        title={area.displayName || area.name}
        actions={
          <>
            {saved && <span style={{ fontSize:"0.82rem", color:"var(--success)", fontWeight:600 }}>✓ Saved</span>}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "💾 Save Area"}
            </button>
          </>
        }
        tabs={(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      />

      {/* ── BASIC ─────────────────────────────────────────────────────────────── */}
      {tab === "basic" && (
        <div className="card">
          <p style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase",
            letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:16 }}>Basic Data</p>

          <div className="form-group" style={{ marginBottom:12 }}>
            <label className="form-label">Area Key (internal ID)</label>
            <input className="form-control" value={area.name} readOnly
              style={{ fontFamily:"monospace", background:"var(--bg-light)", color:"var(--text-muted)" }} />
            <span className="form-hint">Cannot be changed after creation.</span>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="form-control" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Site Name</label>
              <input className="form-control" value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="My Site" />
              <span className="form-hint">{"Used in page title templates: {{siteName}}"}</span>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div className="form-group">
              <label className="form-label">Root Path</label>
              <input className="form-control" value={rootPath}
                onChange={(e) => setRootPath(e.target.value)}
                style={{ fontFamily:"monospace" }} placeholder="/" />
              <span className="form-hint">Base URL for pages in this area</span>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={status}
                onChange={(e) => setStatus(e.target.value as "active"|"inactive")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal description of this area" />
          </div>
        </div>
      )}

      {/* ── STYLE ─────────────────────────────────────────────────────────────── */}
      {tab === "style" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Logos + Favicon */}
          <div className="card">
            <p style={{ fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:16 }}>Logos &amp; Favicon</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
              <ImageUploadField
                label="☀️ Logo light"
                value={logoLight}
                onChange={setLogoLight}
                accept="image"
                hint="Displayed on light backgrounds"
              />
              <ImageUploadField
                label="🌙 Logo dark"
                value={logoDark}
                onChange={setLogoDark}
                accept="image"
                dark
                hint="Displayed on dark backgrounds"
              />
              <ImageUploadField
                label="Favicon"
                value={favicon}
                onChange={setFavicon}
                accept="image"
                hint="Recommended: .svg or .png 32×32"
              />
            </div>
          </div>

          {/* Fonts */}
          <div className="card">
            <p style={{ fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:16 }}>Fonts</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontWeight:600, fontSize:"0.85rem" }}>Custom Fonts</span>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => setCustomFonts([...customFonts, { name:"", url:"" }])}>
                    + Add
                  </button>
                </div>
                {customFonts.map((f, i) => (
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <input className="form-control" style={{ flex:"0 0 120px" }} placeholder="Name"
                      value={f.name} onChange={(e) => setCustomFonts(customFonts.map((x,j) => j===i ? {...x,name:e.target.value} : x))} />
                    <input className="form-control" placeholder="CSS URL (e.g. Google Fonts)"
                      value={f.url} onChange={(e) => setCustomFonts(customFonts.map((x,j) => j===i ? {...x,url:e.target.value} : x))} />
                    <button className="btn-icon" style={{ color:"var(--danger)" }}
                      onClick={() => setCustomFonts(customFonts.filter((_,j) => j!==i))}>✕</button>
                  </div>
                ))}
                {customFonts.length === 0 && <p style={{ fontSize:"0.82rem", color:"var(--text-muted)" }}>No custom fonts.</p>}
              </div>
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontWeight:600, fontSize:"0.85rem" }}>Icon Fonts</span>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => setIconFonts([...iconFonts, { name:"", url:"" }])}>
                    + Add
                  </button>
                </div>
                {iconFonts.map((f, i) => (
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <input className="form-control" style={{ flex:"0 0 120px" }} placeholder="Name"
                      value={f.name} onChange={(e) => setIconFonts(iconFonts.map((x,j) => j===i ? {...x,name:e.target.value} : x))} />
                    <input className="form-control" placeholder="CSS URL (Font Awesome, etc.)"
                      value={f.url} onChange={(e) => setIconFonts(iconFonts.map((x,j) => j===i ? {...x,url:e.target.value} : x))} />
                    <button className="btn-icon" style={{ color:"var(--danger)" }}
                      onClick={() => setIconFonts(iconFonts.filter((_,j) => j!==i))}>✕</button>
                  </div>
                ))}
                {iconFonts.length === 0 && <p style={{ fontSize:"0.82rem", color:"var(--text-muted)" }}>No icon fonts.</p>}
              </div>
            </div>
          </div>

          {/* Color Schemas */}
          <div className="card">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <p style={{ fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.06em", color:"var(--text-muted)", margin:0 }}>Color Schemas</p>
              <button className="btn btn-secondary btn-sm" onClick={addSchema}>+ Add Schema</button>
            </div>

            {schemas.length === 0 && <p style={{ fontSize:"0.82rem", color:"var(--text-muted)" }}>No color schemas defined.</p>}

            {schemas.map((schema, idx) => (
              <div key={schema.id} style={{ border:"1px solid var(--border)", borderRadius:8,
                padding:16, marginBottom:12, background: schema.isDefault ? "#f0fdf4" : "var(--bg-light)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <input className="form-control" style={{ maxWidth:200 }} value={schema.name}
                    onChange={(e) => updateSchema(idx, { name: e.target.value })} />
                  <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                    fontSize:"0.82rem", marginLeft:8 }}>
                    <input type="radio" name="defaultSchema" checked={!!schema.isDefault}
                      onChange={() => setDefault(idx)} />
                    Default
                  </label>
                  <button className="btn-icon" style={{ marginLeft:"auto", color:"var(--danger)" }}
                    onClick={() => removeSchema(idx)}>✕ Remove</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10 }}>
                  {COLOR_KEYS.map(({ key, label }) => (
                    <div key={key} className="form-group" style={{ marginBottom:0 }}>
                      <label className="form-label" style={{ fontSize:"0.72rem" }}>{label}</label>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input type="color" value={schema.colors[key] ?? "#000000"}
                          onChange={(e) => updateSchema(idx, { colors: { ...schema.colors, [key]: e.target.value } })}
                          style={{ width:32, height:32, padding:2, borderRadius:4,
                            border:"1px solid var(--border)", cursor:"pointer" }} />
                        <input className="form-control" style={{ fontFamily:"monospace", fontSize:"0.75rem", padding:"4px 6px" }}
                          value={schema.colors[key] ?? ""}
                          onChange={(e) => updateSchema(idx, { colors: { ...schema.colors, [key]: e.target.value } })} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DESIGN ────────────────────────────────────────────────────────────── */}
      {tab === "design" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:20, alignItems:"start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* ── <head> editor */}
            <div className="card">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <label className="form-label" style={{ margin:0 }}>
                  <code style={{ fontSize:"0.9rem" }}>&lt;head&gt;</code>
                </label>
                <div style={{ position:"relative" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setHeadDropdown(!headDropdown); setBodyDropdown(false); }}
                    style={{ fontSize:"0.75rem", padding:"3px 10px" }}
                  >
                    Load template ▾
                  </button>
                  {headDropdown && (
                    <div style={{
                      position:"absolute", right:0, top:"100%", marginTop:4, zIndex:200,
                      background:"white", border:"1px solid var(--border)", borderRadius:6,
                      boxShadow:"0 4px 16px rgba(0,0,0,0.12)", minWidth:220,
                    }}>
                      {headTemplates.length === 0 ? (
                        <div style={{ padding:"10px 14px", fontSize:"0.8rem", color:"var(--text-muted)" }}>
                          No templates yet — create them in <strong>Templates</strong>.
                        </div>
                      ) : headTemplates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 14px",
                            background:"none", border:"none", cursor:"pointer", fontSize:"0.85rem" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-light)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          onClick={() => { setHeadTemplate(t.html); setHeadDropdown(false); }}
                        >{t.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className="form-hint" style={{ display:"block", marginBottom:8, fontSize:"0.78rem" }}>
                {"HTML <head> structure. Type {{ to open the variable picker."}
              </span>
              <CodeEditor
                value={headTemplate}
                onChange={setHeadTemplate}
                language="html"
                minHeight={200}
                styleVars={styleVars}
                localVars={HEAD_VARS}
                localVarsLabel="Page Variables"
                componentEmbeds={uiComponents}
              />
            </div>

            {/* ── <body> editor */}
            <div className="card">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <label className="form-label" style={{ margin:0 }}>
                  <code style={{ fontSize:"0.9rem" }}>&lt;body&gt;</code>
                </label>
                <div style={{ position:"relative" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setBodyDropdown(!bodyDropdown); setHeadDropdown(false); }}
                    style={{ fontSize:"0.75rem", padding:"3px 10px" }}
                  >
                    Load template ▾
                  </button>
                  {bodyDropdown && (
                    <div style={{
                      position:"absolute", right:0, top:"100%", marginTop:4, zIndex:200,
                      background:"white", border:"1px solid var(--border)", borderRadius:6,
                      boxShadow:"0 4px 16px rgba(0,0,0,0.12)", minWidth:220,
                    }}>
                      {bodyTemplates.length === 0 ? (
                        <div style={{ padding:"10px 14px", fontSize:"0.8rem", color:"var(--text-muted)" }}>
                          No templates yet — create them in <strong>Templates</strong>.
                        </div>
                      ) : bodyTemplates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 14px",
                            background:"none", border:"none", cursor:"pointer", fontSize:"0.85rem" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-light)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          onClick={() => { setBodyTemplate(t.html); setBodyDropdown(false); }}
                        >{t.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className="form-hint" style={{ display:"block", marginBottom:8, fontSize:"0.78rem" }}>
                {"HTML <body> wrapper. Use {{content}}, {{navigation:id}}, {{form:variable}}."}
              </span>
              <CodeEditor
                value={bodyTemplate}
                onChange={setBodyTemplate}
                language="html"
                minHeight={200}
                styleVars={styleVars}
                formEmbeds={forms}
                navEmbeds={navigations}
                localVars={BODY_VARS}
                localVarsLabel="Page Variables"
                componentEmbeds={uiComponents}
              />
            </div>
            <div className="card">
              <label className="form-label" style={{ marginBottom:4 }}>Additional CSS</label>
              <span className="form-hint" style={{ display:"block", marginBottom:8 }}>
                Injected in every page of this area.
              </span>
              <CodeEditor value={areaCss} onChange={setAreaCss} language="css" minHeight={180} hideComponentEmbeds />
            </div>
            <div className="card">
              <label className="form-label" style={{ marginBottom:4 }}>Additional JavaScript</label>
              <span className="form-hint" style={{ display:"block", marginBottom:8 }}>
                Runs on every page of this area.
              </span>
              <CodeEditor value={areaJs} onChange={setAreaJs} language="js" minHeight={180} hideComponentEmbeds />
            </div>
          </div>

          {/* Help / explanation panel */}
          <div className="card" style={{
            position:"sticky", top:70, background:"#f8fafc",
            border:"1px solid var(--border)", fontSize:"0.85rem", lineHeight:1.7,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <span style={{ fontSize:"1.2rem" }}>📄</span>
              <p style={{ margin:0, fontWeight:700, fontSize:"1rem" }}>{"<head> & <body> templates"}</p>
            </div>

            <p style={{ margin:"0 0 14px", color:"var(--text-muted)" }}>
              Define the base HTML structure rendered for every page in this area.
              {" "}Variables <code style={{ background:"#eff6ff", padding:"0 3px", borderRadius:3, color:"var(--primary)" }}>{"{{name}}"}</code> are
              replaced at runtime with the actual content.
            </p>

            <div style={{ borderTop:"1px solid var(--border)", paddingTop:14, marginBottom:14 }}>
              <p style={{ margin:"0 0 6px", fontWeight:600 }}>
                <span style={{ color:"var(--text-muted)", marginRight:6 }}>+</span>Insert a variable
              </p>
              <p style={{ margin:0, color:"var(--text-muted)", fontSize:"0.82rem" }}>
                Type <code style={{ background:"#f1f5f9", padding:"0 3px", borderRadius:3 }}>{"{{"}</code> anywhere in
                the editor — a <strong>picker popup</strong> opens near your cursor with all available variables
                grouped by category (Page, UI Components, Navigation, Forms, Style). Click an item to insert it.
              </p>
            </div>

            <div style={{ borderTop:"1px solid var(--border)", paddingTop:14, marginBottom:14 }}>
              <p style={{ margin:"0 0 6px", fontWeight:600 }}>
                <span style={{ color:"var(--text-muted)", marginRight:6 }}>{"</>"}</span>HTML tags
              </p>
              <p style={{ margin:0, color:"var(--text-muted)", fontSize:"0.82rem" }}>
                Write standard HTML — <code style={{ background:"#f1f5f9", padding:"0 3px", borderRadius:3 }}>&lt;meta&gt;</code>,{" "}
                <code style={{ background:"#f1f5f9", padding:"0 3px", borderRadius:3 }}>&lt;link&gt;</code>,{" "}
                <code style={{ background:"#f1f5f9", padding:"0 3px", borderRadius:3 }}>&lt;script&gt;</code>, etc.
                The editor uses CodeMirror for syntax highlighting and line numbers.
              </p>
            </div>

            <div style={{ borderTop:"1px solid var(--border)", paddingTop:14, marginBottom:14 }}>
              <p style={{ margin:"0 0 6px", fontWeight:600 }}>
                <span style={{ color:"var(--text-muted)", marginRight:6 }}>🎨</span>Additional CSS & JS
              </p>
              <p style={{ margin:0, color:"var(--text-muted)", fontSize:"0.82rem" }}>
                Use the <strong>Additional CSS</strong> and <strong>Additional JS</strong> editors below to inject
                styles and scripts on every page of this area — useful for area-specific overrides or tracking.
              </p>
            </div>

            <div style={{ borderTop:"1px solid var(--border)", paddingTop:14 }}>
              <p style={{ margin:"0 0 6px", fontWeight:600 }}>
                <span style={{ color:"var(--text-muted)", marginRight:6 }}>📋</span>Load a template
              </p>
              <p style={{ margin:0, color:"var(--text-muted)", fontSize:"0.82rem" }}>
                Use the <strong>Load template ▾</strong> button on each editor to start from a predefined
                structure. Manage templates in <strong>CMS → Templates</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── LEGAL ─────────────────────────────────────────────────────────────── */}
      {tab === "legal" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Legal pages */}
          <div className="card">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <p style={{ fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.06em", color:"var(--text-muted)", margin:0 }}>Legal Pages</p>
              <button className="btn btn-secondary btn-sm"
                onClick={() => setLegalPages([...legalPages, { title:"", path:"", content:"" }])}>
                + Add Page
              </button>
            </div>
            {legalPages.length === 0 && <p style={{ fontSize:"0.82rem", color:"var(--text-muted)" }}>No legal pages defined.</p>}
            {legalPages.map((p, i) => (
              <LegalPageRow key={i} page={p}
                onChange={(patch) => setLegalPages(legalPages.map((x,j) => j===i ? {...x,...patch} : x))}
                onRemove={() => setLegalPages(legalPages.filter((_,j) => j!==i))} />
            ))}
          </div>

          {/* Cookie bar */}
          <div className="card">
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <input type="checkbox" id="cookieEnabled" checked={cookieEnabled}
                onChange={(e) => setCookieEnabled(e.target.checked)} />
              <label htmlFor="cookieEnabled" style={{ fontWeight:600, cursor:"pointer" }}>
                Enable Cookie Consent Banner
              </label>
            </div>
            {cookieEnabled && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div className="form-group">
                  <label className="form-label">Label</label>
                  <input className="form-control" value={cookieLabel}
                    onChange={(e) => setCookieLabel(e.target.value)}
                    placeholder="Cookie Preferences" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={3} value={cookieDesc}
                    onChange={(e) => setCookieDesc(e.target.value)}
                    placeholder="We use cookies to enhance your experience..." />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRACKING ──────────────────────────────────────────────────────────── */}
      {tab === "tracking" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card">
            <p style={{ fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:16 }}>Google Analytics</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 200px", gap:12 }}>
              <div className="form-group">
                <label className="form-label">Measurement ID</label>
                <input className="form-control" value={gaId} onChange={(e) => setGaId(e.target.value)}
                  placeholder="G-XXXXXXXXXX" style={{ fontFamily:"monospace" }} />
              </div>
              <div className="form-group">
                <label className="form-label">Inject position</label>
                <select className="form-control" value={gaPosition}
                  onChange={(e) => setGaPosition(e.target.value)}>
                  <option value="head">Head</option>
                  <option value="body-top">Body top</option>
                  <option value="body-bottom">Body bottom</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <p style={{ fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:16 }}>Google Tag Manager</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 200px", gap:12 }}>
              <div className="form-group">
                <label className="form-label">Container ID</label>
                <input className="form-control" value={gtmId} onChange={(e) => setGtmId(e.target.value)}
                  placeholder="GTM-XXXXXXX" style={{ fontFamily:"monospace" }} />
              </div>
              <div className="form-group">
                <label className="form-label">Inject position</label>
                <select className="form-control" value={gtmPosition}
                  onChange={(e) => setGtmPosition(e.target.value)}>
                  <option value="head">Head</option>
                  <option value="body-top">Body top</option>
                  <option value="body-bottom">Body bottom</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <p style={{ fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.06em", color:"var(--text-muted)", margin:0 }}>Custom Scripts</p>
              <button className="btn btn-secondary btn-sm"
                onClick={() => setCustomScripts([...customScripts, { name:"", code:"", position:"body-bottom" }])}>
                + Add Script
              </button>
            </div>
            {customScripts.length === 0 && <p style={{ fontSize:"0.82rem", color:"var(--text-muted)" }}>No custom scripts.</p>}
            {customScripts.map((sc, i) => (
              <div key={i} style={{ border:"1px solid var(--border)", borderRadius:8, padding:14, marginBottom:10 }}>
                <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                  <input className="form-control" placeholder="Script name (e.g. Hotjar)"
                    value={sc.name}
                    onChange={(e) => setCustomScripts(customScripts.map((x,j) => j===i ? {...x,name:e.target.value} : x))} />
                  <select className="form-control" style={{ maxWidth:160 }} value={sc.position}
                    onChange={(e) => setCustomScripts(customScripts.map((x,j) => j===i ? {...x,position:e.target.value as any} : x))}>
                    <option value="head">Head</option>
                    <option value="body-top">Body top</option>
                    <option value="body-bottom">Body bottom</option>
                  </select>
                  <button className="btn-icon" style={{ color:"var(--danger)" }}
                    onClick={() => setCustomScripts(customScripts.filter((_,j) => j!==i))}>✕</button>
                </div>
                <textarea className="form-control" rows={4}
                  style={{ fontFamily:"monospace", fontSize:"0.8rem" }}
                  placeholder="<script>...</script>"
                  value={sc.code}
                  onChange={(e) => setCustomScripts(customScripts.map((x,j) => j===i ? {...x,code:e.target.value} : x))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ACCESS ────────────────────────────────────────────────────────────── */}
      {tab === "access" && (
        <div className="card">
          <p style={{ fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase",
            letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:16 }}>Access Policy</p>

          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer",
            fontWeight:600, marginBottom:20 }}>
            <input type="checkbox" checked={isRestricted}
              onChange={(e) => setIsRestricted(e.target.checked)} />
            This area requires authentication to access
          </label>

          {isRestricted && (
            <div style={{ display:"flex", flexDirection:"column", gap:12, paddingLeft:28,
              borderLeft:"2px solid var(--border)" }}>
              <div className="form-group">
                <label className="form-label">Redirect URL for unauthorized users</label>
                <input className="form-control" value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="/login" style={{ fontFamily:"monospace", maxWidth:320 }} />
                <span className="form-hint">Where to redirect visitors who are not logged in</span>
              </div>
              <div className="form-group">
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:6 }}>
                  <input type="checkbox" checked={regEnabled} onChange={(e) => setRegEnabled(e.target.checked)} />
                  Registration page
                </label>
                {regEnabled && (
                  <input className="form-control" value={regPage}
                    onChange={(e) => setRegPage(e.target.value)}
                    placeholder="/register" style={{ fontFamily:"monospace", maxWidth:320 }} />
                )}
              </div>
              <div className="form-group">
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:6 }}>
                  <input type="checkbox" checked={recoverEnabled} onChange={(e) => setRecoverEnabled(e.target.checked)} />
                  Recover password page
                </label>
                {recoverEnabled && (
                  <input className="form-control" value={recoverPage}
                    onChange={(e) => setRecoverPage(e.target.value)}
                    placeholder="/recover-password" style={{ fontFamily:"monospace", maxWidth:320 }} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Legal page row (collapsible) ──────────────────────────────────────────────
function LegalPageRow({ page, onChange, onRemove }: {
  page: CmsLegalPage;
  onChange: (p: Partial<CmsLegalPage>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border:"1px solid var(--border)", borderRadius:8, marginBottom:10, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
        background:"var(--bg-light)", cursor:"pointer" }} onClick={() => setOpen(!open)}>
        <span style={{ flex:1, fontWeight:600, fontSize:"0.88rem" }}>
          {page.title || <span style={{ color:"var(--text-muted)", fontWeight:400 }}>Untitled page</span>}
        </span>
        <span style={{ fontFamily:"monospace", fontSize:"0.78rem", color:"var(--text-muted)" }}>
          {page.path || "/"}
        </span>
        <button className="btn-icon" style={{ color:"var(--danger)" }}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>
        <span style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding:14, display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-control" value={page.title}
                onChange={(e) => onChange({ title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Path</label>
              <input className="form-control" value={page.path}
                onChange={(e) => onChange({ path: e.target.value })}
                placeholder="/privacy-policy" style={{ fontFamily:"monospace" }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Content (HTML)</label>
            <textarea className="form-control" rows={6} value={page.content}
              onChange={(e) => onChange({ content: e.target.value })}
              style={{ fontFamily:"monospace", fontSize:"0.82rem" }}
              placeholder="<h1>Privacy Policy</h1><p>...</p>" />
          </div>
        </div>
      )}
    </div>
  );
}
