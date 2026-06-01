/**
 * AdminPageHeader — shared top section for admin index/list pages.
 *
 * Layout:
 *   Title + optional subtitle          [actions]
 *   ──────────────────────────────────────────────  (only when tabs present)
 *   [Tab] [Tab] [Tab]
 *
 * Use for: Pages, Components, Areas, Forms, Emails, Navigation, Users, Settings.
 * For editor pages (with back link) use AdminEditorHeader instead.
 */

interface AdminPageHeaderProps {
  /** Main page title */
  title:     string;
  /** Optional subtitle / description shown below the title */
  subtitle?: string;
  /** Right-side actions: buttons, links, etc. */
  actions?:  React.ReactNode;
  /** Optional tab navigation rendered below the title row */
  tabs?:     React.ReactNode;
}

export function AdminPageHeader({ title, subtitle, actions, tabs }: AdminPageHeaderProps) {
  return (
    <div style={{ paddingTop: "1.5rem", marginBottom: tabs ? 0 : 28 }}>
      {/* Title row — min-height matches editor header so buttons align visually */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            16,
        minHeight:      "var(--header-h)",
        paddingBottom:  tabs ? 16 : 0,
      }}>
        <div>
          <h1 style={{
            margin:     0,
            fontSize:   "1.25rem",
            fontWeight: 700,
            color:      "var(--text)",
            lineHeight: 1.2,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              margin:    "3px 0 0",
              fontSize:  "0.8rem",
              color:     "var(--text-muted)",
            }}>
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div style={{
            display:    "flex",
            alignItems: "center",
            gap:        8,
            flexShrink: 0,
          }}>
            {actions}
          </div>
        )}
      </div>

      {/* Tab row (optional) */}
      {tabs && (
        <div className="tabs" style={{ marginBottom: 20 }}>
          {tabs}
        </div>
      )}
    </div>
  );
}
