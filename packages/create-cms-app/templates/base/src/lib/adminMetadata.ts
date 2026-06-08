import type { Metadata } from "next";

export const APP_NAME = "voltab.website";
export const ADMIN_NAME = "CMS Admin";

const DEFAULT_ENTITY_ICON = "📄";
const DEFAULT_ENTITY_LABEL = "Item";

const ADMIN_ICON_LABELS: Record<string, string> = {
  "⊞": "Dashboard",
  "📄": "Page",
  "📋": "Forms",
  "🧩": "Component",
  "📐": "Templates",
  "🧭": "Navigation",
  "🗂️": "Areas",
  "🗂": "Areas",
  "👥": "Users",
  "⚙️": "Settings",
  "⚙": "Settings",
  "📝": "Content",
  "🧱": "Structure",
  "🎨": "Template",
  "🧾": "Variables",
  "🔖": "Schema",
  "↔️": "Placement",
  "↔": "Placement",
  "✉️": "Email",
  "✉": "Email",
};

const ADMIN_ROUTE_ICONS = {
  dashboard: "⊞",
  pages: "📄",
  forms: "📋",
  components: "🧩",
  templates: "📐",
  navigation: "🧭",
  areas: "🗂️",
  users: "👥",
  settings: "⚙️",
} as const;

const ADMIN_TAB_ICONS = {
  content: "📝",
  settings: "⚙️",
  structure: "🧱",
  layouts: "📐",
  navigation: "🧭",
  email: "✉️",
  page: "📄",
} as const;

const ADMIN_BADGE_COLORS: Record<string, string> = {
  "📝": "#d9b86c",
  "⚙️": "#b8c0cc",
  "⚙": "#b8c0cc",
  "🧱": "#d59a7a",
  "📐": "#8fb4ff",
  "🧭": "#7cc7c4",
  "✉️": "#8eb7d9",
  "✉": "#8eb7d9",
  "📄": "#9ccaa3",
  "🎨": "#c792d9",
  "🧾": "#8fb4ff",
  "🔖": "#9f8fe0",
  "↔️": "#90c2d0",
  "↔": "#90c2d0",
};

export type AdminFaviconState = {
  sectionIcon: string;
  badgeIcon?: string | null;
};

type SearchParamsLike = {
  get(name: string): string | null;
};

export const adminLayoutMetadata: Metadata = {
  title: {
    default: `${ADMIN_NAME} | ${APP_NAME}`,
    template: `%s | ${ADMIN_NAME} | ${APP_NAME}`,
  },
  description:
    "Administrative workspace for managing content, design system assets, navigation, users, and site configuration.",
};

export function buildAdminMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
  };
}

export function compactAdminEntityName(
  entityName: string | null | undefined,
  maxLength = 18,
): string {
  const clean = entityName?.replace(/\s+/g, " ").trim() ?? "";
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}

export function normalizeAdminLabel(labelOrIcon: string | null | undefined): string {
  const clean = labelOrIcon?.replace(/\s+/g, " ").trim() ?? "";
  if (!clean) return DEFAULT_ENTITY_LABEL;
  return ADMIN_ICON_LABELS[clean] ?? clean;
}

export function buildAdminEntityTitle(
  entityName: string | null | undefined,
  entityIcon = DEFAULT_ENTITY_ICON,
): string {
  const compactName = compactAdminEntityName(entityName);
  return compactName || normalizeAdminLabel(entityIcon);
}

export function buildAdminSectionTitle(
  sectionLabelOrIcon: string,
  entityName: string | null | undefined,
  entityIcon = DEFAULT_ENTITY_ICON,
): string {
  const sectionLabel = normalizeAdminLabel(sectionLabelOrIcon);
  const entityTitle = buildAdminEntityTitle(entityName, entityIcon);
  return `${sectionLabel} · ${entityTitle}`.trim();
}

export function buildAdminEntityFrameMetadata(
  entityName: string | null | undefined,
  entityIcon: string,
  description: string,
): Metadata {
  const entityTitle = buildAdminEntityTitle(entityName, entityIcon);
  return {
    title: {
      default: entityTitle,
      template: `%s · ${entityTitle}`,
    },
    description,
  };
}

export function buildAdminDocumentTitle(
  sectionLabelOrIcon: string,
  entityName: string | null | undefined,
  entityIcon = DEFAULT_ENTITY_ICON,
): string {
  return `${buildAdminSectionTitle(sectionLabelOrIcon, entityName, entityIcon)} | ${ADMIN_NAME} | ${APP_NAME}`;
}

export function buildAdminEntityMetadata(
  entityLabel: string,
  entityName: string | null | undefined,
  description: string,
): Metadata {
  const compactName = compactAdminEntityName(entityName);
  return {
    title: compactName ? `${entityLabel} · ${compactName}` : entityLabel,
    description,
  };
}

export function getAdminFaviconState(
  pathname: string,
  searchParams?: SearchParamsLike | null,
): AdminFaviconState {
  const tab = searchParams?.get("tab") ?? "";

  if (pathname === "/admin") {
    return { sectionIcon: ADMIN_ROUTE_ICONS.dashboard };
  }

  if (pathname.startsWith("/admin/pages/") && pathname.endsWith("/content")) {
    return {
      sectionIcon: ADMIN_ROUTE_ICONS.pages,
      badgeIcon: ADMIN_TAB_ICONS.content,
    };
  }

  if (pathname.startsWith("/admin/pages/") && pathname.endsWith("/structure")) {
    return {
      sectionIcon: ADMIN_ROUTE_ICONS.pages,
      badgeIcon: ADMIN_TAB_ICONS.structure,
    };
  }

  if (pathname.startsWith("/admin/pages/")) {
    return {
      sectionIcon: ADMIN_ROUTE_ICONS.pages,
      badgeIcon: ADMIN_TAB_ICONS.settings,
    };
  }

  if (pathname.startsWith("/admin/pages")) {
    return { sectionIcon: ADMIN_ROUTE_ICONS.pages };
  }

  if (pathname.startsWith("/admin/forms")) {
    return { sectionIcon: ADMIN_ROUTE_ICONS.forms };
  }

  if (pathname.startsWith("/admin/components")) {
    return { sectionIcon: ADMIN_ROUTE_ICONS.components };
  }

  if (pathname.startsWith("/admin/templates")) {
    return {
      sectionIcon: ADMIN_ROUTE_ICONS.templates,
    };
  }

  if (pathname.startsWith("/admin/navigation")) {
    return { sectionIcon: ADMIN_ROUTE_ICONS.navigation };
  }

  if (pathname.startsWith("/admin/areas")) {
    return { sectionIcon: ADMIN_ROUTE_ICONS.areas };
  }

  if (pathname.startsWith("/admin/users")) {
    return { sectionIcon: ADMIN_ROUTE_ICONS.users };
  }

  if (pathname.startsWith("/admin/settings")) {
    return { sectionIcon: ADMIN_ROUTE_ICONS.settings };
  }

  return { sectionIcon: ADMIN_ROUTE_ICONS.dashboard };
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildAdminFaviconHref(
  sectionIcon: string,
  badgeIcon?: string | null,
): string {
  const main = escapeSvgText(sectionIcon);
  const badgeColor = badgeIcon ? ADMIN_BADGE_COLORS[badgeIcon] ?? "#9ca3af" : "";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <text
        x="32"
        y="34"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="'Segoe UI Emoji', 'Apple Color Emoji', sans-serif"
        font-size="34"
      >${main}</text>
      ${
        badgeColor
          ? `
      <circle cx="49" cy="48" r="9" fill="${badgeColor}" stroke="rgba(255,255,255,0.92)" stroke-width="3" />
      `
          : ""
      }
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function setAdminFavicon(sectionIcon: string, badgeIcon?: string | null): void {
  if (typeof document === "undefined") return;

  const href = buildAdminFaviconHref(sectionIcon, badgeIcon);
  const rels = ["icon", "shortcut icon"];

  for (const rel of rels) {
    let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.type = "image/svg+xml";
    link.href = href;
  }
}
