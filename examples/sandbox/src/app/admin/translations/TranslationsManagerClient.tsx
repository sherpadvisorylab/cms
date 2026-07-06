"use client";

import React, { useState, useTransition } from "react";
import type { CmsTranslationEntry } from "@sherpacms/domain";
import { createTranslationEntry, deleteTranslationEntry, updateTranslationEntry } from "./actions";

interface Props {
  initialEntries: CmsTranslationEntry[];
  defaultLocale: string;
  supportedLocales: string[];
}

export function TranslationsManagerClient({ initialEntries, defaultLocale, supportedLocales }: Props) {
  const [, startTransition] = useTransition();
  const [entries, setEntries] = useState<CmsTranslationEntry[]>(initialEntries);
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newValue, setNewValue] = useState("");
  const [addError, setAddError] = useState("");

  const filteredEntries = entries.filter((entry) => {
    if (!filter.trim()) return true;
    const needle = filter.trim().toLowerCase();
    return (
      entry.key.toLowerCase().includes(needle) ||
      (entry.description ?? "").toLowerCase().includes(needle) ||
      Object.values(entry.values).some((value) => value.toLowerCase().includes(needle))
    );
  });

  function patchLocalValue(id: string, locale: string, value: string) {
    setEntries((previous) =>
      previous.map((entry) =>
        entry.id === id ? { ...entry, values: { ...entry.values, [locale]: value } } : entry,
      ),
    );
  }

  function saveEntry(entry: CmsTranslationEntry) {
    setSavingId(entry.id);
    startTransition(async () => {
      try {
        await updateTranslationEntry(entry.id, { values: entry.values, description: entry.description });
      } finally {
        setSavingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTranslationEntry(id);
      setEntries((previous) => previous.filter((entry) => entry.id !== id));
    });
  }

  function handleCreate() {
    setAddError("");
    if (!newKey.trim()) {
      setAddError("Key is required.");
      return;
    }
    startTransition(async () => {
      try {
        const entry = await createTranslationEntry({
          key: newKey,
          description: newDescription,
          values: { [defaultLocale]: newValue },
        });
        setEntries((previous) => [...previous, entry]);
        setAddOpen(false);
        setNewKey("");
        setNewDescription("");
        setNewValue("");
      } catch (error) {
        setAddError(error instanceof Error ? error.message : "Failed to create entry.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Translations</h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            UI-string dictionary. Reference an entry from any Liquid template as{" "}
            <code style={{ background: "#f1f5f9", padding: "0 4px", borderRadius: 3 }}>{"{{t.key}}"}</code>.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
          + Add key
        </button>
      </div>

      <input
        className="form-control"
        placeholder="Search by key, description, or text..."
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        style={{ maxWidth: 360 }}
      />

      {addOpen && (
        <div className="card" style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Key</label>
              <input
                className="form-control"
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                placeholder="footer_copyright"
                autoFocus
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Description (optional)</label>
              <input
                className="form-control"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Shown in the footer credits line"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{defaultLocale.toUpperCase()} (default) text</label>
            <input
              className="form-control"
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
              placeholder="All rights reserved."
            />
          </div>
          {addError && <p style={{ color: "var(--danger)", fontSize: "0.82rem", margin: "4px 0 0" }}>{addError}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate}>
              Create
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={cellStyle}>Key</th>
              <th style={cellStyle}>Description</th>
              {supportedLocales.map((locale) => (
                <th key={locale} style={cellStyle}>
                  {locale.toUpperCase()}
                  {locale === defaultLocale ? " (default)" : ""}
                </th>
              ))}
              <th style={cellStyle} />
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ ...cellStyle, fontFamily: "monospace", fontWeight: 600 }}>{entry.key}</td>
                <td style={{ ...cellStyle, color: "var(--text-muted)" }}>{entry.description || "—"}</td>
                {supportedLocales.map((locale) => (
                  <td key={locale} style={cellStyle}>
                    <input
                      className="form-control"
                      style={{
                        fontSize: "0.82rem",
                        borderColor: !entry.values[locale] ? "#fecaca" : undefined,
                      }}
                      value={entry.values[locale] ?? ""}
                      placeholder={locale === defaultLocale ? "" : "missing"}
                      onChange={(event) => patchLocalValue(entry.id, locale, event.target.value)}
                      onBlur={() => saveEntry(entries.find((e) => e.id === entry.id)!)}
                    />
                  </td>
                ))}
                <td style={cellStyle}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {savingId === entry.id && (
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Saving…</span>
                    )}
                    <button
                      type="button"
                      style={{ ...iconBtn, color: "var(--danger)" }}
                      onClick={() => handleDelete(entry.id)}
                      title="Delete key"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={supportedLocales.length + 3} style={{ ...cellStyle, textAlign: "center", color: "var(--text-muted)" }}>
                  {entries.length === 0 ? "No translation keys yet." : "No keys match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "8px 12px",
  verticalAlign: "top",
};

const iconBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  cursor: "pointer",
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: "0.72rem",
};
