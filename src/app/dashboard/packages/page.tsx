import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";

const PACKAGE_ORDER: Record<string, number> = {
  starter: 0,
  lite: 1,
  pro: 2,
  premium: 3,
  ultimate: 4,
};

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PackagesPage() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  const rows = await db.select().from(packages).orderBy(asc(packages.priceIdr));
  const sorted = rows.sort(
    (a, b) => (PACKAGE_ORDER[a.tier] ?? 99) - (PACKAGE_ORDER[b.tier] ?? 99),
  );
  const currentPackageId = bundle.event.packageId;

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-navy">Paket</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pilih paket yang sesuai dengan kebutuhan undangan Anda.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {sorted.map((pkg) => {
          const isCurrent = pkg.id === currentPackageId;
          const isRecommended = pkg.tier === "pro";
          return (
            <article
              key={pkg.id}
              className={`flex flex-col rounded-2xl bg-surface-card p-6 shadow-ghost-sm ring-1 ${
                isRecommended
                  ? "ring-2 ring-coral"
                  : "ring-[color:var(--border-ghost)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl text-ink">{pkg.name}</h2>
                {isRecommended && (
                  <span className="rounded-full bg-coral-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-coral-dark">
                    Populer
                  </span>
                )}
                {isCurrent && (
                  <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-navy">
                    Paket Aktif
                  </span>
                )}
              </div>
              <p className="mt-3 font-display text-2xl text-navy">
                {pkg.priceIdr === 0 ? "Gratis" : formatIdr(pkg.priceIdr)}
              </p>
              <p className="text-xs text-ink-hint">
                {pkg.guestLimit} tamu • {pkg.whatsappEnabled ? "WA aktif" : "Tanpa WA"}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-ink-muted">
                {pkg.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-gold-dark">♡</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                className="mt-5 rounded-full border border-[color:var(--border-medium)] px-4 py-2 text-sm font-medium text-ink-muted"
                title="Pembayaran aktif di Sprint 3"
              >
                {isCurrent ? "Paket Aktif" : "Upgrade segera"}
              </button>
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink-hint">
        Upgrade paket via Midtrans akan aktif pada Sprint 3.
      </p>
    </main>
  );
}
