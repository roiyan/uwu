import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/lib/actions/collaborator";

// After a successful OAuth session exchange, if `next` is
// /invite/<token>?accept=1 we fire acceptInvite now (the user is freshly
// authenticated) and send them to /dashboard on success.
async function resolveRedirect(next: string): Promise<string> {
  const match = next.match(/^\/invite\/([A-Za-z0-9_-]+)(?:\?(.*))?$/);
  if (!match) return next;
  const token = match[1];
  const qs = new URLSearchParams(match[2] ?? "");
  if (qs.get("accept") !== "1") return next;

  const res = await acceptInvite(token);
  return res.ok ? "/dashboard" : next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/dashboard";
  // Only allow same-origin relative paths.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const dest = await resolveRedirect(next);
      return NextResponse.redirect(new URL(dest, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Sesi+tidak+valid", url.origin),
  );
}
