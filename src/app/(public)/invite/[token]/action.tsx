"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { acceptInvite } from "@/lib/actions/collaborator";
import { useToast } from "@/components/shared/Toast";

// The invite landing page is anon-accessible. The button is plain
// navigation — NEVER a direct Server Action call — so an anonymous
// visitor can't trigger an auth-required action that throws 500.
//
// Flow:
//   1. Guest (unauthenticated) clicks "Terima & Bergabung"
//      → <Link> to /login?next=/invite/[token]?accept=1
//   2. After login/register with next=..., they land back here with
//      ?accept=1 set.
//   3. This component detects ?accept=1, fires acceptInvite() once
//      (now with an authenticated session), then redirects to /dashboard.
export function InviteAction({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const autoAccept = searchParams.get("accept") === "1";

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!autoAccept || hasFiredRef.current) return;
    hasFiredRef.current = true;

    startTransition(async () => {
      const res = await acceptInvite(token);
      if (res.ok) {
        toast.success(
          "Selamat bergabung! Anda sekarang bisa mengelola undangan bersama.",
        );
        router.push("/dashboard");
        return;
      }
      // Session expired or missing — send back to login to re-auth.
      const msg = res.error ?? "";
      if (msg.includes("ter-autentikasi") || msg.includes("masuk")) {
        router.push(
          `/login?next=${encodeURIComponent(`/invite/${token}?accept=1`)}`,
        );
        return;
      }
      setError(res.error || "Gagal bergabung. Silakan coba lagi.");
      toast.error(res.error || "Gagal bergabung.");
    });
  }, [autoAccept, token, router, toast]);

  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}?accept=1`)}`;

  const baseClasses =
    "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-8 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02]";

  return (
    <>
      {pending || autoAccept ? (
        <button type="button" disabled className={`${baseClasses} disabled:opacity-60`}>
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
          <span>Memproses...</span>
        </button>
      ) : (
        <Link href={loginHref} className={baseClasses}>
          Terima &amp; Bergabung
        </Link>
      )}
      {error && (
        <p className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
