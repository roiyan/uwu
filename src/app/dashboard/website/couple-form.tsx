"use client";

import { useState, useTransition } from "react";
import { updateCoupleAction } from "@/lib/actions/event";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { useToast } from "@/components/shared/Toast";

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
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [bridePhotoUrl, setBridePhotoUrl] = useState(defaults.bridePhotoUrl);
  const [groomPhotoUrl, setGroomPhotoUrl] = useState(defaults.groomPhotoUrl);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(defaults.coverPhotoUrl);

  function handleSubmit(form: FormData) {
    // Optimistic: flash the success toast immediately so users feel the
    // save was instant. If the server rejects, swap to an error toast.
    toast.success("Tersimpan");
    startTransition(async () => {
      const res = await updateCoupleAction(eventId, null, form);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Mempelai Wanita</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Nama lengkap"
            name="brideName"
            required
            defaultValue={defaults.brideName}
          />
          <Field
            label="Panggilan"
            name="brideNickname"
            defaultValue={defaults.brideNickname}
          />
          <Field
            label="Nama ayah"
            name="brideFatherName"
            defaultValue={defaults.brideFatherName}
          />
          <Field
            label="Nama ibu"
            name="brideMotherName"
            defaultValue={defaults.brideMotherName}
          />
          <Field
            label="Instagram"
            name="brideInstagram"
            defaultValue={defaults.brideInstagram}
            placeholder="@username"
          />
        </div>
        <div className="mt-4">
          <PhotoUpload
            eventId={eventId}
            slot="bride-photo"
            label="Foto mempelai wanita"
            value={bridePhotoUrl}
            onChange={setBridePhotoUrl}
          />
          <input type="hidden" name="bridePhotoUrl" value={bridePhotoUrl} />
        </div>
      </section>

      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Mempelai Pria</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Nama lengkap"
            name="groomName"
            required
            defaultValue={defaults.groomName}
          />
          <Field
            label="Panggilan"
            name="groomNickname"
            defaultValue={defaults.groomNickname}
          />
          <Field
            label="Nama ayah"
            name="groomFatherName"
            defaultValue={defaults.groomFatherName}
          />
          <Field
            label="Nama ibu"
            name="groomMotherName"
            defaultValue={defaults.groomMotherName}
          />
          <Field
            label="Instagram"
            name="groomInstagram"
            defaultValue={defaults.groomInstagram}
            placeholder="@username"
          />
        </div>
        <div className="mt-4">
          <PhotoUpload
            eventId={eventId}
            slot="groom-photo"
            label="Foto mempelai pria"
            value={groomPhotoUrl}
            onChange={setGroomPhotoUrl}
          />
          <input type="hidden" name="groomPhotoUrl" value={groomPhotoUrl} />
        </div>
      </section>

      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Cerita &amp; Dekorasi</h2>
        <div className="mt-4 space-y-5">
          <PhotoUpload
            eventId={eventId}
            slot="cover-photo"
            label="Foto sampul (hero undangan)"
            value={coverPhotoUrl}
            onChange={setCoverPhotoUrl}
            aspect="wide"
          />
          <input type="hidden" name="coverPhotoUrl" value={coverPhotoUrl} />

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

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          <span>{pending ? "Menyimpan..." : "Simpan Perubahan"}</span>
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
