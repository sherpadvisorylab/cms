import "./admin.css";
import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { TopLoadingBar } from "@/components/admin/TopLoadingBar";
import { AdminFaviconManager } from "@/components/admin/AdminFaviconManager";
import { DevModeToggle } from "@/components/admin/DevModeToggle";
import { LocaleSwitcher } from "@/components/admin/LocaleSwitcher";
import { adminLayoutMetadata } from "@/lib/adminMetadata";
import { cms } from "@/lib/cms";
import { getPrimaryPublicAreaName } from "@/lib/publicPageResolver";

initAdmin();

export const metadata = adminLayoutMetadata;

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: "",
    items: [
      { href: "/admin", label: "Dashboard", icon: "⊞" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/pages",       label: "Pages",       icon: "📄" },
      { href: "/admin/forms",       label: "Forms",       icon: "📋" },
      { href: "/admin/collections", label: "Collections", icon: "🗃️" },
    ],
  },
  {
    group: "Design",
    items: [
      { href: "/admin/components", label: "Components", icon: "🧩" },
      { href: "/admin/templates",  label: "Templates",  icon: "📐" },
      { href: "/admin/areas",      label: "Areas",      icon: "🗂️" },
      { href: "/admin/navigation", label: "Navigation", icon: "🧭" },
    ],
  },
  {
    group: "Platform",
    items: [
      { href: "/admin/translations", label: "Translations", icon: "🌍" },
      { href: "/admin/redirects", label: "Redirects", icon: "↪" },
      { href: "/admin/users",    label: "Users",    icon: "👥" },
      { href: "/admin/settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;

  if (!session) redirect("/login");

  let email = "";
  try {
    const decoded = await getAuth().verifySessionCookie(session, true);
    email = decoded.email ?? "";
  } catch {
    redirect("/login");
  }

  const [areaName, globalSettings] = await Promise.all([
    getPrimaryPublicAreaName().catch(() => ""),
    cms.settings.get().catch(() => null),
  ]);
  const area = areaName ? await cms.areas.findByKey(areaName).catch(() => null) : null;
  const defaultLocale =
    area?.defaultLocale ??
    globalSettings?.branding?.defaultLanguage ??
    process.env.SHERPA_DEFAULT_LOCALE ??
    "en";
  const supportedLocales =
    area?.supportedLocales ??
    globalSettings?.branding?.supportedLocales ??
    [];
  const multiLanguageEnabled = globalSettings?.branding?.multiLanguageEnabled ?? false;

  return (
    <div className="flex h-screen bg-gray-100">
      <TopLoadingBar />
      <AdminFaviconManager />
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="border-b border-gray-700" style={{ height: "var(--header-h)", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span className="font-bold text-lg">CMS Admin</span>
          {multiLanguageEnabled && supportedLocales.length > 1 && (
            <LocaleSwitcher supportedLocales={supportedLocales} defaultLocale={defaultLocale} />
          )}
        </div>
        <nav className="flex-1 px-2 py-3 overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {NAV.map((group, gi) => (
            <div key={gi} style={{ marginBottom: gi < NAV.length - 1 ? 8 : 0 }}>
              {group.group && (
                <p style={{
                  fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.1em", color: "#6b7280",
                  padding: "8px 12px 4px", margin: 0,
                }}>
                  {group.group}
                </p>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className="block rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "6px 10px" }}
                >
                  <span style={{ fontSize: "0.9rem", width: 18, textAlign: "center", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: "8px 10px 4px", borderTop: "1px solid #374151" }}>
          <DevModeToggle />
        </div>
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400 truncate">{email}</span>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem", paddingBottom: "1.5rem" }}>
        {children}
      </main>
    </div>
  );
}
