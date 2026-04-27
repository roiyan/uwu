import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Hosts that are NOT subdomain invitations even when they look like
// "<sub>.<root>". `www` is the canonical apex; `app` would be the
// dashboard host if we ever split it; `api` is reserved for a future
// API split. Add to this list rather than introducing per-host
// regexes.
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin"]);

function extractSubdomain(hostname: string): string | null {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (!rootDomain) return null;

  // Strip port (e.g. "vivi.uwu.id:3000") so the suffix match works
  // when running locally with a hosts-file alias.
  const host = hostname.split(":")[0];
  if (!host) return null;

  if (host === rootDomain || host === `www.${rootDomain}`) return null;
  if (!host.endsWith(`.${rootDomain}`)) return null;

  const sub = host.slice(0, host.length - rootDomain.length - 1);
  if (!sub || sub.includes(".")) return null;
  if (RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(hostname);

  if (subdomain) {
    const { pathname, search } = request.nextUrl;

    // _next/data payloads + API routes resolve at the platform
    // level, not under /<slug>. The matcher already filters static
    // chunks; this is a defensive belt-and-braces.
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/") ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    // Already rewritten — guard against double-rewrites if the
    // request loops back through middleware.
    if (
      pathname === `/${subdomain}` ||
      pathname.startsWith(`/${subdomain}/`)
    ) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = `/${subdomain}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    return NextResponse.rewrite(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and webhook endpoints — they don't need auth refresh.
    "/((?!_next/static|_next/image|_next/data|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|otf)$).*)",
  ],
};
