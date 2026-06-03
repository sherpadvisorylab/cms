export function VersionBadge({ versionNumber }: { versionNumber: number | null }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 10px", borderRadius: 999,
        background: versionNumber ? "#eff6ff" : "#f8fafc",
        border: `1px solid ${versionNumber ? "#bfdbfe" : "var(--border)"}`,
        color: versionNumber ? "#1d4ed8" : "var(--text-muted)",
        fontSize: "0.74rem", fontWeight: 700, lineHeight: 1,
      }}
      title={versionNumber ? `You are editing version ${versionNumber}` : "This page has not been versioned yet"}
    >
      <span style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: versionNumber ? "#2563eb" : "#94a3b8",
      }} />
      {versionNumber ? `Editing v${versionNumber}` : "Draft"}
    </span>
  );
}
