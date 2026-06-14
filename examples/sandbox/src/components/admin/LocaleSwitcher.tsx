"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ADMIN_LOCALE_COOKIE } from "@/lib/i18n";

interface LocaleSwitcherProps {
  supportedLocales: string[];
  defaultLocale: string;
}

function readAdminLocaleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_LOCALE_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function LocaleSwitcher({ supportedLocales, defaultLocale }: LocaleSwitcherProps) {
  const [current, setCurrent] = useState<string>(defaultLocale);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromCookie = readAdminLocaleCookie();
    if (fromCookie && supportedLocales.includes(fromCookie)) setCurrent(fromCookie);
  }, [supportedLocales]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (supportedLocales.length <= 1) return null;

  function switchLocale(locale: string) {
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    setOpen(false);
    startTransition(() => {
      setCurrent(locale);
      window.location.reload();
    });
  }

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Switch admin language"
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 6,
          background: open ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#d1d5db", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700,
          letterSpacing: "0.05em", transition: "background 0.12s",
        }}
      >
        <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>🌐</span>
        <span>{current.toUpperCase()}</span>
        <span style={{ fontSize: "0.6rem", opacity: 0.7, marginLeft: 1 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          minWidth: 110, zIndex: 100, overflow: "hidden",
        }}>
          {supportedLocales.map((locale) => {
            const isActive = locale === current;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => switchLocale(locale)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "8px 14px", textAlign: "left",
                  background: isActive ? "rgba(59,130,246,0.2)" : "transparent",
                  border: "none", cursor: "pointer",
                  color: isActive ? "#60a5fa" : "#d1d5db",
                  fontSize: "0.82rem", fontWeight: isActive ? 700 : 400,
                  transition: "background 0.1s",
                }}
              >
                {isActive && <span style={{ fontSize: "0.5rem", color: "#60a5fa" }}>●</span>}
                {!isActive && <span style={{ fontSize: "0.5rem", color: "transparent" }}>●</span>}
                {locale.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
