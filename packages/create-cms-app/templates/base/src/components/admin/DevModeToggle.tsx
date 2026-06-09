"use client";

import { useEffect, useState } from "react";
import { getDevModeStatus, setDevModeEnabled } from "@/app/admin/dev-mode/actions";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DevModeToggle() {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDevModeStatus().then(({ until: u }) => setUntil(u));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = !!until && until > now;
  const remaining = active ? until - now : 0;

  async function toggle() {
    setLoading(true);
    try {
      const result = await setDevModeEnabled(!active, 60);
      setUntil(result.until);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={active ? "Click to disable dev mode" : "Enable dev mode — disables public cache for 60 min"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        width: "100%",
        padding: "7px 10px",
        borderRadius: 8,
        border: "none",
        cursor: loading ? "wait" : "pointer",
        fontSize: "0.78rem",
        fontWeight: 600,
        transition: "background 0.15s, color 0.15s",
        background: active ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
        color: active ? "#fca5a5" : "#9ca3af",
      }}
    >
      <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>⚡</span>
      {active ? (
        <span style={{ flex: 1, minWidth: 0 }}>
          Dev mode{" "}
          <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" }}>
            {formatCountdown(remaining)}
          </span>
        </span>
      ) : (
        <span style={{ flex: 1, color: "#6b7280" }}>Dev mode</span>
      )}
      <span
        style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: active ? "#ef4444" : "#374151",
          boxShadow: active ? "0 0 0 2px rgba(239,68,68,0.35)" : "none",
          transition: "background 0.2s, box-shadow 0.2s",
        }}
      />
    </button>
  );
}
