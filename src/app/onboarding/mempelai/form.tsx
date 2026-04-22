"use client";

import { useActionState } from "react";
import { saveMempelaiAction } from "@/lib/actions/onboarding";
import { SaveButton } from "@/components/shared/SaveButton";

type Defaults = {
  brideName: string;
  brideNickname: string | null;
  groomName: string;
  groomNickname: string | null;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

export function MempelaiForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction] = useActionState(saveMempelaiAction, null);

  return (
    <form action={formAction} className="mt-8 space-y-6">
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

      {state && !state.ok && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <SaveButton idleLabel="Lanjut" />
      </div>
    </form>
  );
}
