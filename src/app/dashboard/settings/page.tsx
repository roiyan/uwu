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
  // Accept "preferensi" as a UX-facing alias for the internal "budaya"
  // tab id — the rest of the app links here with ?tab=preferensi
  // (e.g. checkin-disabled-card, the dashboard check-in CTA), which
  // matches the human-facing label of the tab.
  const rawTab = params.tab === "preferensi" ? "budaya" : params.tab;
  const requested = rawTab as Tab | undefined;
  const active: Tab =
    requested && VALID_TABS.includes(requested) ? requested : "akun";

  // `overflow-x-hidden` on <main> is a safety net so the body never
  // scrolls horizontally even if a child briefly breaches viewport
  // width. The negative-margin tab strip below has its own scroll
  // container so it still pans normally.
  return (
    <main className="flex-1 overflow-x-hidden px-5 py-8 lg:px-12 lg:py-12">
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
        <h1 className="d-serif mt-3 text-[32px] font-extralight leading-[1.1] tracking-[-0.01em] text-[var(--d-ink)] md:text-[54px] md:leading-[1.05]">
          Ruang kendali,
          <br />
          sepenuhnya milik{" "}
          <em className="d-serif italic text-[var(--d-coral)]">kalian</em>.
        </h1>
        <p className="mt-4 max-w-[58ch] text-[14px] leading-relaxed text-[var(--d-ink-dim)] md:text-[15px]">
          Kelola profil, preferensi, dan pengaturan acara kalian.
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
          checkinEnabled: bundle.event.checkinEnabled,
          timezone: bundle.event.timezone ?? "Asia/Jakarta",
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
