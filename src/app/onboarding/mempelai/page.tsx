import { Suspense } from "react";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { Stepper } from "@/components/onboarding/Stepper";
import { MempelaiForm } from "./form";

// Fresh users hit this page the instant they finish registering, so the shell
// (stepper + heading + blank form) paints without waiting on any DB calls.
// The existing-data merge streams in once requireAuthedUser + bundle resolve.
export default function MempelaiStep() {
  return (
    <div>
      <Stepper current="mempelai" reached={["mempelai"]} />

      <section className="mt-10">
        <h1 className="font-display text-3xl text-ink">Ceritakan tentang mempelai</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Nama ini akan tampil di undangan dan dashboard Anda. Anda bisa mengubahnya kapan saja.
        </p>
      </section>

      <Suspense
        fallback={
          <MempelaiForm
            defaults={{
              brideName: "",
              brideNickname: "",
              groomName: "",
              groomNickname: "",
            }}
          />
        }
      >
        <MempelaiFormLoader />
      </Suspense>
    </div>
  );
}

async function MempelaiFormLoader() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  const bundle = current ? await getEventBundle(current.event.id) : null;

  return (
    <MempelaiForm
      defaults={{
        brideName: bundle?.couple?.brideName ?? "",
        brideNickname: bundle?.couple?.brideNickname ?? "",
        groomName: bundle?.couple?.groomName ?? "",
        groomNickname: bundle?.couple?.groomNickname ?? "",
      }}
    />
  );
}
