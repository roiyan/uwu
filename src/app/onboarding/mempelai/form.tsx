"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMempelaiAction } from "@/lib/actions/onboarding";
import { useToast } from "@/components/shared/Toast";

type Defaults = {
  brideName: string;
  brideNickname: string | null;
  groomName: string;
  groomNickname: string | null;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[color:var(--color-brand-lavender)]/50 focus:ring-2 focus:ring-[color:var(--color-brand-lavender)]/30";

export function MempelaiForm({ defaults }: { defaults: Defaults }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Awaits the save — first-time mempelai CREATES the event, and the
  // next page needs that event to exist. Fast session auth keeps this
  // ~300-500ms on a warm Lambda.
  function handleSubmit(form: FormData) {
    setError(null);
    toast.success("Tersimpan");
    startTransition(async () => {
      const res = await saveMempelaiAction(null, form);
      if (res.ok) {
        router.push(res.data!.next);
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-6 shadow-2xl">
        <h2 className="font-display text-lg text-white/90">Mempelai Wanita</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-white/70">Nama lengkap</span>
            <input
              name="brideName"
              required
              defaultValue={defaults.brideName}
              placeholder="Anisa Putri Larasati"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-white/70">Nama panggilan</span>
            <input
              name="brideNickname"
              defaultValue={defaults.brideNickname ?? ""}
              placeholder="Anisa"
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-6 shadow-2xl">
        <h2 className="font-display text-lg text-white/90">Mempelai Pria</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-white/70">Nama lengkap</span>
            <input
              name="groomName"
              required
              defaultValue={defaults.groomName}
              placeholder="Rizky Pratama Hidayat"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-white/70">Nama panggilan</span>
            <input
              name="groomNickname"
              defaultValue={defaults.groomNickname ?? ""}
              placeholder="Rizky"
              className={inputClass}
            />
          </label>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-8 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          <span>{pending ? "Menyimpan..." : "Selanjutnya →"}</span>
        </button>
      </div>
    </form>
  );
}
