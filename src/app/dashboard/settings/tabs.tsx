"use client";

import { useActionState, useEffect, useTransition } from "react";
import Link from "next/link";
import { updateProfileAction } from "@/lib/actions/profile";
import {
  publishEventAction,
  unpublishEventAction,
  updateEventSettingsAction,
} from "@/lib/actions/event";
import { useToast } from "@/components/shared/Toast";

type Tab = "akun" | "acara" | "budaya";

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

const TABS: { id: Tab; label: string }[] = [
  { id: "akun", label: "Akun" },
  { id: "acara", label: "Acara" },
  { id: "budaya", label: "Budaya" },
];

export function SettingsTabs({
  active,
  eventId,
  isPublished,
  profile,
  event,
}: {
  active: Tab;
  eventId: string;
  isPublished: boolean;
  profile: { email: string; fullName: string; phone: string };
  event: {
    title: string;
    slug: string;
    musicUrl: string;
    culturalPreference: "islami" | "umum" | "custom";
  };
}) {
  return (
    <div className="space-y-6">
      <nav className="flex gap-1 rounded-full bg-surface-card p-1 shadow-ghost-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/settings?tab=${tab.id}`}
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm transition-colors ${
              active === tab.id
                ? "bg-navy text-ink-inverse"
                : "text-ink-muted hover:text-navy"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {active === "akun" && <AkunTab profile={profile} />}
      {active === "acara" && (
        <AcaraTab eventId={eventId} isPublished={isPublished} event={event} />
      )}
      {active === "budaya" && <BudayaTab eventId={eventId} event={event} />}
    </div>
  );
}

function AkunTab({
  profile,
}: {
  profile: { email: string; fullName: string; phone: string };
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) toast.success("Profil diperbarui");
    else if (state && !state.ok) toast.error(state.error);
  }, [state, toast]);

  return (
    <form action={formAction} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm space-y-4">
      <h2 className="font-display text-xl text-ink">Profil Akun</h2>
      <label className="block">
        <span className="text-sm font-medium text-ink">Email</span>
        <input
          value={profile.email}
          disabled
          className={`${inputClass} opacity-70`}
        />
        <span className="mt-1 block text-xs text-ink-hint">
          Email tidak dapat diubah saat ini.
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">Nama lengkap</span>
        <input
          name="fullName"
          required
          defaultValue={profile.fullName}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">No. WhatsApp</span>
        <input
          name="phone"
          defaultValue={profile.phone}
          placeholder="+62 812 3456 7890"
          className={inputClass}
        />
      </label>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-dark">
          Profil diperbarui.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}

function AcaraTab({
  eventId,
  isPublished,
  event,
}: {
  eventId: string;
  isPublished: boolean;
  event: { title: string; slug: string; musicUrl: string; culturalPreference: "islami" | "umum" | "custom" };
}) {
  const bound = updateEventSettingsAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(bound, null);
  const [publishPending, startPublishTransition] = useTransition();
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) toast.success("Detail acara tersimpan");
    else if (state && !state.ok) toast.error(state.error);
  }, [state, toast]);

  return (
    <div className="space-y-6">
      <form action={formAction} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm space-y-4">
        <h2 className="font-display text-xl text-ink">Detail Acara</h2>
        <label className="block">
          <span className="text-sm font-medium text-ink">Judul acara</span>
          <input
            name="title"
            required
            defaultValue={event.title}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">URL Undangan</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-[color:var(--border-medium)] bg-white px-3 py-2 text-sm focus-within:border-navy focus-within:shadow-[var(--focus-ring-navy)]">
            <span className="text-ink-hint">uwu.id/</span>
            <input
              name="slug"
              required
              defaultValue={event.slug}
              pattern="[a-z0-9\-]+"
              className="flex-1 bg-transparent outline-none"
            />
          </div>
          <span className="mt-1 block text-xs text-ink-hint">
            Hanya huruf kecil, angka, dan tanda minus.
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">URL musik latar</span>
          <input
            name="musicUrl"
            type="url"
            defaultValue={event.musicUrl}
            placeholder="https://..."
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-ink-hint">
            Musik akan muted secara default. Tamu dapat mengaktifkan manual.
          </span>
        </label>
        <input
          type="hidden"
          name="culturalPreference"
          value={event.culturalPreference}
        />

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
            {pending ? "Menyimpan..." : "Simpan Detail"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Publikasi</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {isPublished
            ? "Undangan aktif dan dapat diakses publik melalui URL."
            : "Undangan masih tersembunyi. Publikasikan untuk membagikan ke tamu."}
        </p>
        <div className="mt-4 flex items-center gap-3">
          {isPublished ? (
            <button
              type="button"
              disabled={publishPending}
              onClick={() =>
                startPublishTransition(async () => {
                  await unpublishEventAction(eventId);
                })
              }
              className="rounded-full border border-[color:var(--border-medium)] px-6 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              {publishPending ? "Memproses..." : "Unpublish"}
            </button>
          ) : (
            <button
              type="button"
              disabled={publishPending}
              onClick={() =>
                startPublishTransition(async () => {
                  await publishEventAction(eventId);
                })
              }
              className="rounded-full bg-navy px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
            >
              {publishPending ? "Memproses..." : "Publikasikan Undangan"}
            </button>
          )}
          <Link
            href={`/${event.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-ink-muted hover:text-navy"
          >
            Buka URL undangan →
          </Link>
        </div>
      </section>
    </div>
  );
}

function BudayaTab({
  eventId,
  event,
}: {
  eventId: string;
  event: { title: string; slug: string; musicUrl: string; culturalPreference: "islami" | "umum" | "custom" };
}) {
  const bound = updateEventSettingsAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(bound, null);
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) toast.success("Preferensi budaya tersimpan");
    else if (state && !state.ok) toast.error(state.error);
  }, [state, toast]);

  // M-04 — landing page promises three tones; expose the "santai" flavor
  // via the existing `custom` enum with a friendlier label.
  const options: { id: "umum" | "islami" | "custom"; label: string; description: string }[] = [
    {
      id: "umum",
      label: "Formal & Puitis",
      description: "Tone netral formal. Musik default menyala. Template broadcast umum.",
    },
    {
      id: "islami",
      label: "Islami",
      description:
        "Pembuka Assalamu'alaikum. Musik default mute. Label akad: Akad Nikah.",
    },
    {
      id: "custom",
      label: "Santai & Hangat",
      description:
        "Nada personal dan akrab — cocok untuk undangan ke teman dekat dan keluarga.",
    },
  ];

  return (
    <form action={formAction} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm space-y-4">
      <h2 className="font-display text-xl text-ink">Preferensi Budaya</h2>
      <p className="text-sm text-ink-muted">
        Pengaturan ini memengaruhi template broadcast WhatsApp, label jadwal, dan tone AI copywriter.
      </p>
      <input type="hidden" name="title" value={event.title} />
      <input type="hidden" name="slug" value={event.slug} />
      <input type="hidden" name="musicUrl" value={event.musicUrl} />

      <div className="space-y-3">
        {options.map((opt) => (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition-colors ${
              event.culturalPreference === opt.id
                ? "border-navy bg-navy-50"
                : "border-[color:var(--border-ghost)] hover:border-navy"
            }`}
          >
            <input
              type="radio"
              name="culturalPreference"
              value={opt.id}
              defaultChecked={event.culturalPreference === opt.id}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-medium text-ink">{opt.label}</p>
              <p className="text-xs text-ink-muted">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-dark">
          Preferensi tersimpan.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan Preferensi"}
        </button>
      </div>
    </form>
  );
}
