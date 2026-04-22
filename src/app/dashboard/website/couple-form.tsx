"use client";

import { useActionState } from "react";
import { updateCoupleAction } from "@/lib/actions/event";

type Defaults = {
  brideName: string;
  brideNickname: string;
  brideFatherName: string;
  brideMotherName: string;
  brideInstagram: string;
  bridePhotoUrl: string;
  groomName: string;
  groomNickname: string;
  groomFatherName: string;
  groomMotherName: string;
  groomInstagram: string;
  groomPhotoUrl: string;
  coverPhotoUrl: string;
  story: string;
  quote: string;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

export function CoupleForm({
  eventId,
  defaults,
}: {
  eventId: string;
  defaults: Defaults;
}) {
  const boundAction = updateCoupleAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(boundAction, null);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Mempelai Wanita</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Nama lengkap" name="brideName" required defaultValue={defaults.brideName} />
          <Field label="Panggilan" name="brideNickname" defaultValue={defaults.brideNickname} />
          <Field label="Nama ayah" name="brideFatherName" defaultValue={defaults.brideFatherName} />
          <Field label="Nama ibu" name="brideMotherName" defaultValue={defaults.brideMotherName} />
          <Field label="Instagram" name="brideInstagram" defaultValue={defaults.brideInstagram} placeholder="@username" />
          <Field label="URL foto" name="bridePhotoUrl" type="url" defaultValue={defaults.bridePhotoUrl} placeholder="https://..." />
        </div>
      </section>

      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Mempelai Pria</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Nama lengkap" name="groomName" required defaultValue={defaults.groomName} />
          <Field label="Panggilan" name="groomNickname" defaultValue={defaults.groomNickname} />
          <Field label="Nama ayah" name="groomFatherName" defaultValue={defaults.groomFatherName} />
          <Field label="Nama ibu" name="groomMotherName" defaultValue={defaults.groomMotherName} />
          <Field label="Instagram" name="groomInstagram" defaultValue={defaults.groomInstagram} placeholder="@username" />
          <Field label="URL foto" name="groomPhotoUrl" type="url" defaultValue={defaults.groomPhotoUrl} placeholder="https://..." />
        </div>
      </section>

      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Cerita &amp; Dekorasi</h2>
        <div className="mt-4 space-y-4">
          <Field
            label="URL foto sampul"
            name="coverPhotoUrl"
            type="url"
            defaultValue={defaults.coverPhotoUrl}
            placeholder="https://..."
            hint="Foto utama yang tampil di hero undangan."
          />
          <label className="block">
            <span className="text-sm font-medium text-ink">Kutipan atau ayat</span>
            <textarea
              name="quote"
              rows={2}
              defaultValue={defaults.quote}
              placeholder="“Dan di antara tanda-tanda kekuasaan-Nya…”"
              className={`${inputClass} resize-none`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Cerita singkat</span>
            <textarea
              name="story"
              rows={5}
              defaultValue={defaults.story}
              placeholder="Tuliskan cerita perjalanan cinta Anda..."
              className={`${inputClass} resize-none`}
            />
          </label>
        </div>
      </section>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-dark">
          Perubahan tersimpan.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input {...rest} className={inputClass} />
      {hint && <span className="mt-1 block text-xs text-ink-hint">{hint}</span>}
    </label>
  );
}
