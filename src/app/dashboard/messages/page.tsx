import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { listGuestGroups } from "@/lib/db/queries/guests";
import { listBroadcastsForEvent } from "@/lib/actions/broadcast";
import { MESSAGE_TEMPLATES } from "@/lib/templates/messages";
import { isWhatsAppConfigured } from "@/lib/providers/whatsapp";
import { isEmailConfigured } from "@/lib/providers/email";
import { MessagesClient } from "./client";

export default async function MessagesPage() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  const [groups, history] = await Promise.all([
    listGuestGroups(current.event.id),
    listBroadcastsForEvent(current.event.id),
  ]);

  const cp = bundle.event.culturalPreference;

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-navy">Kirim Undangan</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Kirim undangan via WhatsApp atau Email. Template otomatis disesuaikan
            dengan preferensi budaya acara Anda.
          </p>
        </div>
        <Link
          href="/dashboard/guests"
          className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
        >
          Kelola Tamu
        </Link>
      </header>

      <MessagesClient
        eventId={bundle.event.id}
        culturalPreference={cp}
        templates={MESSAGE_TEMPLATES}
        groups={groups.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
        history={history.map((h) => ({
          id: h.id,
          channel: h.channel,
          templateSlug: h.templateSlug,
          status: h.status,
          totalRecipients: h.totalRecipients,
          sentCount: h.sentCount,
          failedCount: h.failedCount,
          createdAt: h.createdAt.toISOString(),
          subject: h.subject,
        }))}
        providers={{
          whatsappConfigured: isWhatsAppConfigured(),
          emailConfigured: isEmailConfigured(),
        }}
      />
    </main>
  );
}
