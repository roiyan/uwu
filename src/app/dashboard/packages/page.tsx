import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { listOrdersForUser } from "@/lib/actions/checkout";

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
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  const [rows, orders] = await Promise.all([
    db.select().from(packages).orderBy(asc(packages.priceIdr)),
    listOrdersForUser(),
  ]);
  const sorted = rows.sort(
    (a, b) => (PACKAGE_ORDER[a.tier] ?? 99) - (PACKAGE_ORDER[b.tier] ?? 99),
  );
  const currentPackageId = bundle.event.packageId;

  const ORDER_STATUS_LABEL: Record<string, string> = {
    pending: "Menunggu Pembayaran",
    paid: "Berhasil",
    expired: "Kedaluwarsa",
    canceled: "Dibatalkan",
    failed: "Gagal",
  };
  const ORDER_STATUS_STYLE: Record<string, string> = {
    pending: "bg-gold-50 text-gold-dark",
    paid: "bg-[#E8F3EE] text-[#3B7A57]",
    expired: "bg-surface-muted text-ink-muted",
    canceled: "bg-surface-muted text-ink-muted",
    failed: "bg-rose-50 text-rose-dark",
  };

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
              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="mt-5 rounded-full border border-[color:var(--border-medium)] px-4 py-2 text-sm font-medium text-ink-muted"
                >
                  Paket Aktif
                </button>
              ) : pkg.priceIdr === 0 ? (
                <button
                  type="button"
                  disabled
                  className="mt-5 rounded-full border border-[color:var(--border-medium)] px-4 py-2 text-sm font-medium text-ink-hint"
                >
                  Paket Gratis
                </button>
              ) : (
                <Link
                  href={`/dashboard/checkout?tier=${pkg.tier}`}
                  className="mt-5 rounded-full bg-coral px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-coral-dark"
                >
                  Upgrade ke {pkg.name}
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Riwayat Pembayaran</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Belum ada pembayaran.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl bg-surface-card shadow-ghost-sm">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink-hint">
                <tr className="border-b border-[color:var(--border-ghost)]">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">Jumlah</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(({ order, pkg }) => (
                  <tr
                    key={order.id}
                    className="border-b border-[color:var(--border-ghost)] last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-ink">
                      {order.orderRef}
                    </td>
                    <td className="px-4 py-3 text-ink">{pkg?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-ink">
                      {formatIdr(order.amountIdr)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          ORDER_STATUS_STYLE[order.status] ?? ""
                        }`}
                      >
                        {ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {new Date(order.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
