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
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

export function MempelaiForm({ defaults }: { defaults: Defaults }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      <div className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-lg text-ink">Mempelai Wanita</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Nama lengkap</span>
            <input
              name="brideName"
              required
              defaultValue={defaults.brideName}
              placeholder="Anisa Putri Larasati"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Nama panggilan</span>
            <input
              name="brideNickname"
              defaultValue={defaults.brideNickname ?? ""}
              placeholder="Anisa"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-lg text-ink">Mempelai Pria</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Nama lengkap</span>
            <input
              name="groomName"
              required
              defaultValue={defaults.groomName}
              placeholder="Rizky Pratama Hidayat"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Nama panggilan</span>
            <input
              name="groomNickname"
              defaultValue={defaults.groomNickname ?? ""}
              placeholder="Rizky"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-navy px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          <span>{pending ? "Menyimpan..." : "Lanjut"}</span>
        </button>
      </div>
    </form>
  );
}
