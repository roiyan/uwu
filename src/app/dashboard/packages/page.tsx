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
    pending: "bg-[rgba(212,184,150,0.10)] text-[var(--d-gold)]",
    paid: "bg-[#E8F3EE] text-[#3B7A57]",
    expired: "bg-[var(--d-bg-2)] text-[var(--d-ink-dim)]",
    canceled: "bg-[var(--d-bg-2)] text-[var(--d-ink-dim)]",
    failed: "border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]",
  };

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
          <p className="d-eyebrow">Paket</p>
        </div>
        <h1 className="d-serif mt-3 text-[40px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--d-ink)] md:text-[48px]">
          Pilih paket yang{" "}
          <em className="d-serif italic text-[var(--d-coral)]">tepat</em>.
        </h1>
        <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
          Setiap paket terhubung dengan kapasitas tamu, akses tema, dan fitur
          broadcast yang berbeda.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {sorted.map((pkg) => {
          const isCurrent = pkg.id === currentPackageId;
          const isRecommended = pkg.tier === "pro";
          return (
            <article
              key={pkg.id}
              className={`flex flex-col rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-sm ring-1 ${
                isRecommended
                  ? "ring-2 ring-coral"
                  : "ring-[color:var(--border-ghost)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl text-[var(--d-ink)]">{pkg.name}</h2>
                {isRecommended && (
                  <span className="rounded-full bg-coral-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--d-coral)]">
                    Populer
                  </span>
                )}
                {isCurrent && (
                  <span className="rounded-full bg-[rgba(143,163,217,0.08)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--d-ink)]">
                    Paket Aktif
                  </span>
                )}
              </div>
              <p className="mt-3 font-display text-2xl text-[var(--d-ink)]">
                {pkg.priceIdr === 0 ? "Gratis" : formatIdr(pkg.priceIdr)}
              </p>
              <p className="text-xs text-[var(--d-ink-faint)]">
                {pkg.guestLimit} tamu • {pkg.whatsappEnabled ? "WA aktif" : "Tanpa WA"}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-[var(--d-ink-dim)]">
                {pkg.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[var(--d-gold)]">♡</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="mt-5 rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-sm font-medium text-[var(--d-ink-dim)]"
                >
                  Paket Aktif
                </button>
              ) : pkg.priceIdr === 0 ? (
                <button
                  type="button"
                  disabled
                  className="mt-5 rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-sm font-medium text-[var(--d-ink-faint)]"
                >
                  Paket Gratis
                </button>
              ) : (
                <Link
                  href={`/dashboard/checkout?tier=${pkg.tier}`}
                  className="mt-5 rounded-full bg-coral px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:opacity-90"
                >
                  Upgrade ke {pkg.name}
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl text-[var(--d-ink)]">Riwayat Pembayaran</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--d-ink-dim)]">Belum ada pembayaran.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl bg-[var(--d-bg-card)] shadow-ghost-sm">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[var(--d-ink-faint)]">
                <tr className="border-b border-[var(--d-line)]">
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
                    className="border-b border-[var(--d-line)] last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--d-ink)]">
                      {order.orderRef}
                    </td>
                    <td className="px-4 py-3 text-[var(--d-ink)]">{pkg?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--d-ink)]">
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
                    <td className="px-4 py-3 text-xs text-[var(--d-ink-dim)]">
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
