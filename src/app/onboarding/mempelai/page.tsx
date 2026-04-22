import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { Stepper } from "@/components/onboarding/Stepper";
import { MempelaiForm } from "./form";

export default async function MempelaiStep() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  const bundle = current ? await getEventBundle(current.event.id) : null;

  const reached: ("mempelai" | "jadwal" | "tema" | "selesai")[] = ["mempelai"];
  if (bundle?.couple) reached.push("jadwal");
  if (bundle && bundle.schedules.length > 0) reached.push("tema");
  if (bundle?.event.themeId) reached.push("selesai");

  return (
    <div>
      <Stepper current="mempelai" reached={reached} />

      <section className="mt-10">
        <h1 className="font-display text-3xl text-ink">Ceritakan tentang mempelai</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Nama ini akan tampil di undangan dan dashboard Anda. Anda bisa mengubahnya kapan saja.
        </p>
      </section>

      <MempelaiForm
        defaults={{
          brideName: bundle?.couple?.brideName ?? "",
          brideNickname: bundle?.couple?.brideNickname ?? "",
          groomName: bundle?.couple?.groomName ?? "",
          groomNickname: bundle?.couple?.groomNickname ?? "",
        }}
      />
    </div>
  );
}
