import { Suspense } from "react";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { Stepper } from "@/components/onboarding/Stepper";
import { MempelaiForm } from "./form";

export default function MempelaiStep() {
  return (
    <div>
      <Stepper current="mempelai" reached={["mempelai"]} />
      <section className="mt-10">
        <h1 className="font-display text-3xl text-white">
          Ceritakan tentang <span className="italic text-gradient">mempelai</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Nama ini akan tampil di undangan dan dashboard Anda. Anda bisa
          mengubahnya kapan saja.
        </p>
      </section>

      <Suspense
        fallback={
          <MempelaiForm
            accountEmail=""
            defaults={{
              brideName: "",
              brideNickname: "",
              groomName: "",
              groomNickname: "",
              ownerRole: "bride",
              partnerEmail: "",
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

  // Pull any existing pending partner invite so we can prefill the email
  // field if the user is editing the step again.
  const { db } = await import("@/lib/db");
  const { eventMembers } = await import("@/lib/db/schema");
  const { and, eq, inArray } = await import("drizzle-orm");
  let partnerEmail = "";
  if (bundle?.event?.id) {
    const [invite] = await db
      .select({
        email: eventMembers.invitedEmail,
      })
      .from(eventMembers)
      .where(
        and(
          eq(eventMembers.eventId, bundle.event.id),
          inArray(eventMembers.inviteStatus, ["pending", "accepted"]),
        ),
      )
      .limit(1);
    partnerEmail = invite?.email ?? "";
  }

  return (
    <MempelaiForm
      accountEmail={user.email ?? ""}
      defaults={{
        brideName: bundle?.couple?.brideName ?? "",
        brideNickname: bundle?.couple?.brideNickname ?? "",
        groomName: bundle?.couple?.groomName ?? "",
        groomNickname: bundle?.couple?.groomNickname ?? "",
        ownerRole: bundle?.event?.ownerRole ?? "bride",
        partnerEmail,
      }}
    />
  );
}
