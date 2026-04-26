import { redirect } from "next/navigation";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import {
  listGiftAccountsAction,
  listGiftConfirmationsAction,
  getGiftStatsAction,
} from "@/lib/actions/gift";
import { AmplopClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AmplopPage() {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");

  const eventId = current.event.id;
  const [accountsRes, confirmsRes, statsRes] = await Promise.all([
    listGiftAccountsAction(eventId),
    listGiftConfirmationsAction(eventId),
    getGiftStatsAction(eventId),
  ]);

  return (
    <main
      className="theme-dashboard flex-1 px-5 py-8 lg:px-12 lg:py-12"
      style={{ background: "var(--d-bg-0)", color: "var(--d-ink)" }}
    >
      <header className="mb-9">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px w-8 bg-[var(--d-coral)]" />
          <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
            Tanda Kasih
          </p>
        </div>
        <h1 className="d-serif mt-3.5 text-[clamp(34px,4.5vw,52px)] font-extralight leading-[1.05] tracking-[-0.02em] text-[var(--d-ink)]">
          Setiap amplop adalah doa{" "}
          <em className="d-serif italic text-[var(--d-coral)]">
            yang dibungkus
          </em>{" "}
          dengan kasih.
        </h1>
        <p className="d-serif mt-4 max-w-[58ch] text-[14px] italic leading-relaxed text-[var(--d-ink-dim)]">
          Terima tanda kasih dari mereka yang turut bahagia — kapan pun, dari
          mana pun.
        </p>
      </header>

      <AmplopClient
        eventId={eventId}
        initialAccounts={accountsRes.ok ? accountsRes.data ?? [] : []}
        initialConfirmations={confirmsRes.ok ? confirmsRes.data ?? [] : []}
        initialStats={
          statsRes.ok
            ? statsRes.data ?? { total: 0, verified: 0, verifiedAmount: 0 }
            : { total: 0, verified: 0, verifiedAmount: 0 }
        }
      />
    </main>
  );
}
