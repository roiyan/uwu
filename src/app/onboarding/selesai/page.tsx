import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { Stepper } from "@/components/onboarding/Stepper";

export default function SelesaiStep() {
  return (
    <div>
      <Stepper
        current="selesai"
        reached={["mempelai", "jadwal", "tema", "selesai"]}
      />
      <Suspense fallback={<Card title="Menyiapkan undangan Anda..." />}>
        <SelesaiContent />
      </Suspense>
      <div className="mx-auto mt-10 flex items-center justify-center gap-3 text-gold">
        <span className="h-px w-16 bg-current" />
        <span>♡</span>
        <span className="h-px w-16 bg-current" />
      </div>
    </div>
  );
}

async function SelesaiContent() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle?.couple) redirect("/onboarding/mempelai");

  return (
    <section className="mt-12 rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-8 text-center shadow-2xl">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white shadow-lg"
        style={{ background: "var(--brand-gradient)" }}
      >
        ♡
      </div>
      <h1 className="mt-4 font-display text-3xl text-white">
        <span className="italic text-gradient">Selamat!</span> Undangan Anda siap dipersiapkan.
      </h1>
      <p className="mt-3 text-sm text-white/60">
        Acara <span className="font-medium text-white">{bundle.event.title}</span>{" "}
        sudah dibuat. Lanjutkan dengan menyesuaikan isi undangan, tambah tamu, lalu
        kirim undangan digital.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard"
          className="rounded-full bg-gradient-brand px-8 py-3 text-sm font-medium text-white shadow-[0_6px_20px_-6px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02]"
        >
          Masuk Dashboard
        </Link>
        <Link
          href="/dashboard/website"
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
        >
          Edit Isi Undangan
        </Link>
      </div>
    </section>
  );
}

function Card({ title }: { title: string }) {
  return (
    <section className="mt-12 rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-8 text-center shadow-2xl">
      <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-white/10" />
      <p className="mt-4 text-sm text-white/60">{title}</p>
    </section>
  );
}
