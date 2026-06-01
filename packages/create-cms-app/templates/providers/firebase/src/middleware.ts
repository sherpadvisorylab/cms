import { NextResponse, type NextRequest } from "next/server";

// Middleware runs on Edge runtime — firebase-admin (node:crypto) is not allowed here.
// Only check cookie presence; real token verification happens in admin/layout.tsx
// which runs on the Node.js runtime as a Server Component.
export function middleware(request: NextRequest) {
  const session = request.cookies.get("__session")?.value;

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
