"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/actions/collaborator";
import { useToast } from "@/components/shared/Toast";

export function InviteAction({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptInvite(token);
      if (res.ok) {
        toast.success(
          "Selamat bergabung! Anda sekarang bisa mengelola undangan bersama.",
        );
        router.push("/dashboard");
        return;
      }

      // Not authenticated → send to login / register with callback that
      // will re-run the accept after auth succeeds.
      const msg = res.error ?? "";
      if (msg.includes("ter-autentikasi") || msg.includes("masuk")) {
        const callback = `/invite/${token}`;
        router.push(
          `/register?callbackUrl=${encodeURIComponent(callback)}&accept=true`,
        );
        return;
      }
      setError(res.error);
      toast.error(res.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAccept}
        disabled={pending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-8 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {pending && (
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        <span>{pending ? "Memproses..." : "Terima & Bergabung"}</span>
      </button>
      {error && (
        <p className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
