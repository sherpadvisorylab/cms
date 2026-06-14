import { NextResponse, type NextRequest } from "next/server";
import { negotiateLocale, LOCALE_COOKIE } from "@/lib/i18n";

// Middleware runs on Edge runtime — firebase-admin (node:crypto) is not allowed here.
// Only check cookie presence; real token verification happens in admin/layout.tsx
// which runs on the Node.js runtime as a Server Component.

const SKIP_EXTENSIONS = /\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|woff|woff2|ttf|map)$/;

// ── Locale config (in-memory cache, 60s TTL) ──────────────────────────────────

interface AreaLocaleConfig {
  defaultLocale: string;
  supportedLocales: string[];
}

let localeConfigCache: { config: AreaLocaleConfig; expiresAt: number } | null = null;

async function fetchLocaleConfig(origin: string): Promise<AreaLocaleConfig | null> {
  const now = Date.now();
  if (localeConfigCache && localeConfigCache.expiresAt > now) {
    return localeConfigCache.config;
  }
  try {
    const res = await fetch(`${origin}/api/locale-config`, {
      next: { revalidate: 60, tags: ["area-locales"] },
    });
    if (!res.ok) return null;
    const data = await res.json() as AreaLocaleConfig;
    if (!data.defaultLocale || !data.supportedLocales?.length) return null;
    localeConfigCache = { config: data, expiresAt: now + 60_000 };
    return data;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin auth guard
  if (pathname.startsWith("/admin")) {
    const session = request.cookies.get("__session")?.value;
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Skip internal Next.js routes, API routes, and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    SKIP_EXTENSIONS.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ── Locale detection & redirect (first visit only) ──────────────────────────
  const localeConfig = await fetchLocaleConfig(request.nextUrl.origin);
  if (localeConfig && localeConfig.supportedLocales.length > 1) {
    const { defaultLocale, supportedLocales } = localeConfig;
    const existingCookie = request.cookies.get(LOCALE_COOKIE)?.value;

    if (!existingCookie) {
      const acceptLang = request.headers.get("accept-language");
      const negotiated = negotiateLocale(acceptLang, supportedLocales, defaultLocale);

      if (negotiated !== defaultLocale) {
        const url = request.nextUrl.clone();
        url.pathname = `/${negotiated}${pathname === "/" ? "" : pathname}`;
        const response = NextResponse.redirect(url, { status: 302 });
        response.cookies.set(LOCALE_COOKIE, negotiated, {
          path: "/",
          maxAge: 31536000,
          sameSite: "lax",
        });
        return response;
      }

      const response = NextResponse.next();
      response.cookies.set(LOCALE_COOKIE, defaultLocale, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
