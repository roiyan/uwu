import { Suspense } from "react";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { StepHeader } from "../components/step-header";
import { HydratePreview } from "../components/preview-store";
import { MempelaiForm } from "./form";

export default function MempelaiStep() {
  return (
    <div>
      <StepHeader
        eyebrow="Mulai dari awal — bab pertama"
        title={
          <>
            Ceritakan tentang{" "}
            <em className="ob-serif italic text-[var(--ob-coral)]">
              mempelai.
            </em>
          </>
        }
        sub="Nama ini akan tampil di undangan dan dashboard Anda. Anda bisa mengubahnya kapan saja — tidak ada keputusan yang permanen di sini."
      />

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
    <>
      {/* Mirror server-loaded data into the sidebar preview store so
          the live card already shows the right names on refresh. */}
      <HydratePreview
        brideName={bundle?.couple?.brideName ?? ""}
        brideNickname={bundle?.couple?.brideNickname ?? ""}
        groomName={bundle?.couple?.groomName ?? ""}
        groomNickname={bundle?.couple?.groomNickname ?? ""}
      />
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
    </>
  );
}
