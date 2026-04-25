import { redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventMembers, profiles } from "@/lib/db/schema";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { SettingsTabs } from "./tabs";

type Tab = "akun" | "acara" | "budaya" | "kolaborator";

const VALID_TABS: Tab[] = ["akun", "acara", "budaya", "kolaborator"];

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  // Profile + collaborators are independent, run them in parallel.
  const [[profile], collabRows] = await Promise.all([
    db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1),
    // Active partner collaborators (pending + accepted). Revoked /
    // expired are hidden — the Kolaborator tab only surfaces live state.
    db
      .select()
      .from(eventMembers)
      .where(
        and(
          eq(eventMembers.eventId, bundle.event.id),
          inArray(eventMembers.inviteStatus, ["pending", "accepted"]),
        ),
      )
      .orderBy(asc(eventMembers.invitedAt)),
  ]);

  const isOwner = bundle.event.ownerId === user.id;

  const params = await searchParams;
  const requested = params.tab as Tab | undefined;
  const active: Tab =
    requested && VALID_TABS.includes(requested) ? requested : "akun";

  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-px w-10"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
            }}
          />
          <p className="d-eyebrow">Pengaturan</p>
        </div>
        <h1 className="d-serif mt-3 text-[40px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--d-ink)] md:text-[48px]">
          Atur{" "}
          <em className="d-serif italic text-[var(--d-coral)]">
            preferensi
          </em>{" "}
          akun Anda.
        </h1>
        <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
          Kelola akun Anda dan pengaturan acara — profil, kolaborator,
          publikasi, dan preferensi tampilan undangan.
        </p>
      </header>

      <SettingsTabs
        active={active}
        eventId={bundle.event.id}
        isPublished={bundle.event.isPublished}
        profile={{
          email: user.email ?? profile?.email ?? "",
          fullName: profile?.fullName ?? "",
          phone: profile?.phone ?? "",
        }}
        event={{
          title: bundle.event.title,
          slug: bundle.event.slug,
          musicUrl: bundle.event.musicUrl ?? "",
          culturalPreference: bundle.event.culturalPreference,
        }}
        owner={{
          fullName: profile?.fullName ?? null,
          email: user.email ?? profile?.email ?? "",
          isCurrentUser: isOwner,
        }}
        collaborators={collabRows.map((r) => ({
          id: r.id,
          invitedEmail: r.invitedEmail,
          invitedName: r.invitedName,
          acceptedEmail: r.acceptedEmail,
          inviteStatus: r.inviteStatus,
          inviteToken: r.inviteToken,
          invitedAt: r.invitedAt.toISOString(),
          expiresAt: r.expiresAt?.toISOString() ?? null,
          acceptedAt: r.acceptedAt?.toISOString() ?? null,
        }))}
        origin={appUrl()}
      />
    </main>
  );
}
