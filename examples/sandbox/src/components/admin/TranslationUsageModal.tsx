"use client";

import { useState, type CSSProperties } from "react";
import type { CmsTranslationEntry } from "@sherpacms/domain";
import { updateTranslationEntry } from "@/app/admin/translations/actions";

interface Props {
  onClose: () => void;
  onInsert: (token: string) => void;
  usedKeys: string[];
  entries: CmsTranslationEntry[];
  locales: string[];
  defaultLocale: string;
}

export function TranslationUsageModal({
  onClose,
  onInsert,
  usedKeys,
  entries: initialEntries,
  locales,
  defaultLocale,
}: Props) {
  const [entries, setEntries] = useState<CmsTranslationEntry[]>(initialEntries);
  const [showAll, setShowAll] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const usedSet = new Set(usedKeys);
  const usedEntries = entries.filter((entry) => usedSet.has(entry.key));
  const missingKeys = usedKeys.filter((key) => !entries.some((entry) => entry.key === key));
  const otherEntries = entries.filter((entry) => !usedSet.has(entry.key));

  function patchValue(id: string, locale: string, value: string) {
    setEntries((previous) =>
      previous.map((entry) => (entry.id === id ? { ...entry, values: { ...entry.values, [locale]: value } } : entry)),
    );
  }

  function save(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    setSavingId(id);
    updateTranslationEntry(id, { values: entry.values }).finally(() => setSavingId(null));
  }

  function renderTable(list: CmsTranslationEntry[], emptyLabel: string, withInsert: boolean) {
    if (list.length === 0) {
      return <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "8px 0" }}>{emptyLabel}</p>;
    }
    return (
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={cellStyle}>Key</th>
              {locales.map((locale) => (
                <th key={locale} style={cellStyle}>
                  {locale.toUpperCase()}
                  {locale === defaultLocale ? " (default)" : ""}
                </th>
              ))}
              {withInsert && <th style={cellStyle} />}
            </tr>
          </thead>
          <tbody>
            {list.map((entry) => (
              <tr key={entry.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ ...cellStyle, fontFamily: "monospace", fontWeight: 600 }}>{entry.key}</td>
                {locales.map((locale) => (
                  <td key={locale} style={cellStyle}>
                    {withInsert ? (
                      <span style={{ color: entry.values[locale] ? "inherit" : "var(--text-muted)", fontStyle: entry.values[locale] ? "normal" : "italic" }}>
                        {entry.values[locale] || "missing"}
                      </span>
                    ) : (
                      <input
                        className="form-control"
                        style={{ fontSize: "0.8rem", borderColor: !entry.values[locale] ? "#fecaca" : undefined }}
                        value={entry.values[locale] ?? ""}
                        onChange={(event) => patchValue(entry.id, locale, event.target.value)}
                        onBlur={() => save(entry.id)}
                      />
                    )}
                  </td>
                ))}
                {withInsert && (
                  <td style={cellStyle}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onInsert(`{{t.${entry.key}}}`)}>
                      Insert
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {savingId && <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Saving…</p>}
      </div>
    );
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "white", borderRadius: 12, padding: 24, width: 760, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Translations used in this template</h3>
          <button type="button" style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }} onClick={onClose}>
            X
          </button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
          Manage the <code style={{ background: "#f1f5f9", padding: "0 4px", borderRadius: 3 }}>{"{{t.key}}"}</code> keys
          referenced here. Edits save automatically, same as the Translations page.
        </p>

        {missingKeys.length > 0 && (
          <p style={{ fontSize: "0.8rem", color: "var(--danger)", marginBottom: 8 }}>
            Referenced but not defined in the dictionary: {missingKeys.map((key) => `{{t.${key}}}`).join(", ")}. Add
            {missingKeys.length === 1 ? " it" : " them"} from the Translations page.
          </p>
        )}

        {renderTable(usedEntries, "No dictionary keys used in this template yet.", false)}

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer", marginTop: 4 }}>
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
          Show other dictionary keys not used here
        </label>

        {showAll && (
          <div style={{ marginTop: 12 }}>{renderTable(otherEntries, "No other keys in the dictionary.", true)}</div>
        )}
      </div>
    </div>
  );
}

const cellStyle: CSSProperties = {
  padding: "8px 12px",
  verticalAlign: "top",
};
