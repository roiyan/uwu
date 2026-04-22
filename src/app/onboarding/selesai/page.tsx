import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { Stepper } from "@/components/onboarding/Stepper";

export default async function SelesaiStep() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");

  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding/mempelai");
  if (!bundle.couple) redirect("/onboarding/mempelai");
  if (bundle.schedules.length === 0) redirect("/onboarding/jadwal");
  if (!bundle.event.themeId) redirect("/onboarding/tema");

  return (
    <div>
      <Stepper
        current="selesai"
        reached={["mempelai", "jadwal", "tema", "selesai"]}
      />

      <section className="mt-12 rounded-2xl bg-surface-card p-8 text-center shadow-ghost-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-50 text-3xl text-gold-dark">
          ♡
        </div>
        <h1 className="mt-4 font-display text-3xl text-ink">
          Selamat! Undangan Anda siap dipersiapkan.
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Acara <span className="font-medium text-ink">{bundle.event.title}</span> sudah dibuat.
          Lanjutkan dengan menyesuaikan isi undangan, tambah tamu, lalu kirim undangan digital.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark"
          >
            Masuk Dashboard
          </Link>
          <Link
            href="/dashboard/website"
            className="rounded-full border border-[color:var(--border-medium)] px-6 py-3 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
          >
            Edit Isi Undangan
          </Link>
        </div>
      </section>

      <div className="mx-auto mt-10 flex items-center justify-center gap-3 text-gold">
        <span className="h-px w-16 bg-current" />
        <span>♡</span>
        <span className="h-px w-16 bg-current" />
      </div>
    </div>
  );
}
