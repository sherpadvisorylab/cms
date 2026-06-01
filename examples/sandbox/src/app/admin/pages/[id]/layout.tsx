// Layout is intentionally minimal — each child page renders its own
// PageEditorHeader (sticky top bar + tabs) so it can include page-specific
// action buttons alongside the back link.
export default function PageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
