"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setTranslationKey, removeTranslationKey } from "../actions";

interface Translation {
  id: string;
  title: string;
  locale: string;
  status: string;
  permalink: string;
}

interface Props {
  pageId: string;
  currentLocale: string;
  translationKey: string | null;
  siblings: Translation[];
}

export function TranslationsPanel({ pageId, currentLocale, translationKey: initialKey, siblings: initialSiblings }: Props) {
  const [translationKey, setKey] = useState(initialKey);
  const [siblings, setSiblings] = useState(initialSiblings);
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleGenerate() {
    setError("");
    startTransition(async () => {
      try {
        const result = await setTranslationKey(pageId, null);
        setKey(result.translationKey);
        setSiblings(result.siblings);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate translation key");
      }
    });
  }

  function handleRemove() {
    setError("");
    startTransition(async () => {
      try {
        await removeTranslationKey(pageId);
        setKey(null);
        setSiblings([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove translation key");
      }
    });
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <p style={{
        fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 14,
      }}>
        Translations
      </p>

      {!translationKey ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
            No translation key assigned. Generate one to link this page to its translations in other locales.
          </p>
          <button type="button" className="btn btn-secondary" onClick={handleGenerate} style={{ alignSelf: "flex-start" }}>
            Generate translation key
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{
              fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 5, padding: "3px 8px",
            }}>
              {translationKey}
            </span>
            <button
              type="button"
              onClick={handleRemove}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.78rem", textDecoration: "underline" }}
            >
              remove
            </button>
          </div>

          {siblings.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {siblings.map((s) => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 7,
                  border: "1px solid var(--border)", background: "var(--surface)",
                }}>
                  <span style={{
                    fontFamily: "monospace", fontWeight: 700, fontSize: "0.8rem",
                    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: 4, padding: "2px 7px", color: "#2563eb", minWidth: 36, textAlign: "center",
                  }}>
                    {(s.locale || "?").toUpperCase()}
                  </span>
                  <span style={{ flex: 1, fontSize: "0.83rem", fontWeight: 600 }}>{s.title}</span>
                  <span style={{
                    fontSize: "0.72rem", fontFamily: "monospace", color: "var(--text-muted)",
                  }}>
                    {s.permalink}
                  </span>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                    color: s.status === "published" ? "#16a34a" : "#9ca3af",
                  }}>
                    {s.status}
                  </span>
                  {s.id !== pageId && (
                    <Link href={`/admin/pages/${s.id}`} style={{ fontSize: "0.78rem", color: "var(--primary)" }}>
                      Edit →
                    </Link>
                  )}
                  {s.id === pageId && (
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>current</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
              No other translations linked yet. To link a translation, open the other locale page and assign the same translation key.
            </p>
          )}
        </div>
      )}

      {error && (
        <p style={{ marginTop: 10, fontSize: "0.8rem", color: "var(--danger)" }}>{error}</p>
      )}
    </div>
  );
}
