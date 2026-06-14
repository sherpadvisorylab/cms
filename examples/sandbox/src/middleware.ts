import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { negotiateLocale, LOCALE_COOKIE } from "@/lib/i18n";

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

  // Skip internal Next.js routes, API routes, and static assets for non-admin paths
  if (
    !pathname.startsWith("/admin") && (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      SKIP_EXTENSIONS.test(pathname)
    )
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    await supabase.auth.signOut();
  }

  // Unauthenticated users trying to access /admin → redirect to /login
  if (!user && pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── Locale detection & redirect (first visit only, public routes) ────────────
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/login")) {
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

        supabaseResponse.cookies.set(LOCALE_COOKIE, defaultLocale, {
          path: "/",
          maxAge: 31536000,
          sameSite: "lax",
        });
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
