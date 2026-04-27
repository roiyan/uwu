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

// Visual tier the design ref calls "Silk / Velvet / Couture" — mapped
// to the actual DB tiers so we never rename anything underneath.
type TierKind = "free" | "standard" | "recommended" | "premium" | "elite";

function tierKind(tier: string): TierKind {
  switch (tier) {
    case "starter":
      return "free";
    case "lite":
      return "standard";
    case "pro":
      return "recommended";
    case "premium":
      return "premium";
    case "ultimate":
      return "elite";
    default:
      return "standard";
  }
}

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
  const currentPackage = sorted.find((p) => p.id === currentPackageId) ?? null;

  const ORDER_STATUS_LABEL: Record<string, string> = {
    pending: "Menunggu Pembayaran",
    paid: "Berhasil",
    expired: "Kedaluwarsa",
    canceled: "Dibatalkan",
    failed: "Gagal",
  };
  const ORDER_STATUS_STYLE: Record<string, string> = {
    pending: "bg-[rgba(212,184,150,0.10)] text-[var(--d-gold)]",
    paid: "bg-[rgba(126,211,164,0.12)] text-[var(--d-green)]",
    expired: "bg-[var(--d-bg-2)] text-[var(--d-ink-dim)]",
    canceled: "bg-[var(--d-bg-2)] text-[var(--d-ink-dim)]",
    failed:
      "border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]",
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
        <h1 className="d-serif mt-3 text-[40px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--d-ink)] md:text-[54px]">
          Investasi untuk hari
          <br />
          yang{" "}
          <em className="d-serif italic text-[var(--d-coral)]">tak terulang</em>.
        </h1>
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-[var(--d-ink-dim)]">
          Pilih paket yang sesuai dengan kebutuhan acara kalian.
        </p>

        {currentPackage && (
          <div
            className="mt-6 inline-flex items-center gap-4 rounded-[14px] border border-[rgba(240,160,156,0.4)] bg-[var(--d-bg-card)] px-5 py-3"
            style={{
              boxShadow: "0 0 0 1px rgba(240,160,156,0.10) inset",
            }}
          >
            <span
              aria-hidden
              className="h-2 w-2 animate-pulse rounded-full bg-[var(--d-coral)]"
              style={{ boxShadow: "0 0 12px rgba(240,160,156,0.6)" }}
            />
            <div>
              <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-ink-dim)]">
                Paket Anda Saat Ini
              </p>
              <p className="d-serif mt-1 text-[18px] font-light text-[var(--d-ink)]">
                {currentPackage.name}{" "}
                <span className="text-[var(--d-ink-dim)]">·</span>{" "}
                <span className="text-[var(--d-coral)]">
                  {currentPackage.priceIdr === 0
                    ? "Gratis"
                    : formatIdr(currentPackage.priceIdr)}
                </span>
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {sorted.map((pkg) => {
          const isCurrent = pkg.id === currentPackageId;
          const kind = tierKind(pkg.tier);
          return (
            <PackageCard
              key={pkg.id}
              kind={kind}
              isCurrent={isCurrent}
              name={pkg.name}
              price={pkg.priceIdr}
              priceLabel={
                pkg.priceIdr === 0 ? "Gratis" : formatIdr(pkg.priceIdr)
              }
              guestLimit={pkg.guestLimit}
              whatsappEnabled={pkg.whatsappEnabled}
              features={pkg.features as string[]}
              upgradeHref={`/dashboard/checkout?tier=${pkg.tier}`}
            />
          );
        })}
      </div>

      <section className="mt-12">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-px w-8"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
            }}
          />
          <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
            Riwayat Pembayaran
          </p>
        </div>
        {orders.length === 0 ? (
          <p className="mt-5 text-[13px] text-[var(--d-ink-dim)]">
            Belum ada riwayat pembayaran.
          </p>
        ) : (
          <div className="mt-5 d-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--d-line)]">
                    <Th>ID Pesanan</Th>
                    <Th>Paket</Th>
                    <Th>Jumlah</Th>
                    <Th>Status</Th>
                    <Th>Tanggal</Th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(({ order, pkg }) => (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--d-line)] transition-colors last:border-0 hover:bg-[rgba(237,232,222,0.025)]"
                    >
                      <td className="d-mono px-4 py-3 text-[11px] text-[var(--d-ink)]">
                        {order.orderRef}
                      </td>
                      <td className="px-4 py-3 text-[var(--d-ink)]">
                        {pkg?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--d-ink)]">
                        {formatIdr(order.amountIdr)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`d-mono inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                            ORDER_STATUS_STYLE[order.status] ?? ""
                          }`}
                        >
                          {ORDER_STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--d-ink-dim)]">
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
          </div>
        )}
      </section>
    </main>
  );
}

function PackageCard({
  kind,
  isCurrent,
  name,
  price,
  priceLabel,
  guestLimit,
  whatsappEnabled,
  features,
  upgradeHref,
}: {
  kind: TierKind;
  isCurrent: boolean;
  name: string;
  price: number;
  priceLabel: string;
  guestLimit: number;
  whatsappEnabled: boolean;
  features: string[];
  upgradeHref: string;
}) {
  // Visual styling per tier intent — recommended (pro) gets coral
  // glow, premium tiers get gold accent, free is subdued. Current
  // plan always wins the highlight regardless of tier.
  const isRecommended = kind === "recommended";
  const isElite = kind === "elite" || kind === "premium";

  const cardClass = isCurrent
    ? "border-[var(--d-coral)] shadow-[0_0_0_1px_var(--d-coral)_inset,0_24px_60px_rgba(240,160,156,0.16)]"
    : isRecommended
      ? "border-[rgba(240,160,156,0.32)] shadow-[0_24px_60px_rgba(240,160,156,0.10)]"
      : isElite
        ? "border-[rgba(212,184,150,0.28)] shadow-[0_24px_60px_rgba(212,184,150,0.08)]"
        : "border-[var(--d-line)]";

  const cardBg = isRecommended
    ? "linear-gradient(180deg, rgba(240,160,156,0.06) 0%, var(--d-bg-card) 60%)"
    : isElite
      ? "linear-gradient(180deg, rgba(212,184,150,0.05) 0%, var(--d-bg-card) 60%)"
      : "var(--d-bg-card)";

  const priceColor = isElite
    ? "var(--d-gold)"
    : isRecommended
      ? "var(--d-coral)"
      : "var(--d-ink)";

  return (
    <article
      className={`relative flex flex-col rounded-[18px] border p-6 ${cardClass}`}
      style={{ background: cardBg }}
    >
      {isRecommended && !isCurrent && (
        <span className="d-mono absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--d-coral)] px-3 py-1 text-[9px] font-medium uppercase tracking-[0.32em] text-[var(--d-bg-0)] shadow-[0_8px_20px_rgba(240,160,156,0.4)]">
          ✦ Populer ✦
        </span>
      )}
      {isElite && !isRecommended && !isCurrent && (
        <span className="d-mono absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center rounded-full bg-[var(--d-gold)] px-3 py-1 text-[9px] font-medium uppercase tracking-[0.32em] text-[var(--d-bg-0)]">
          Premium
        </span>
      )}
      {isCurrent && (
        <span className="d-mono absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--d-coral)] px-3 py-1 text-[9px] font-medium uppercase tracking-[0.32em] text-[var(--d-bg-0)] shadow-[0_8px_20px_rgba(240,160,156,0.4)]">
          <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--d-bg-0)]" />
          Aktif
        </span>
      )}

      <header className="text-center">
        <h2 className="d-mono text-[10px] uppercase tracking-[0.36em] text-[var(--d-ink-dim)]">
          {name}
        </h2>
        <p
          className="d-serif mt-4 text-[42px] font-extralight leading-none"
          style={{ color: priceColor }}
        >
          {price === 0 ? "Gratis" : priceLabel}
        </p>
        {price > 0 && (
          <p className="d-mono mt-2 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
            sekali bayar
          </p>
        )}
      </header>

      <p className="d-mono mt-6 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
        {guestLimit} tamu · {whatsappEnabled ? "WA aktif" : "WA manual"}
      </p>

      <ul className="mt-5 flex-1 space-y-2.5 text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-0.5 inline-block text-[12px]"
              style={{ color: "var(--d-green)" }}
            >
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-[var(--d-line)] pt-5">
        {isCurrent ? (
          <button
            type="button"
            disabled
            className="d-mono w-full rounded-full border border-[var(--d-line-strong)] px-4 py-2.5 text-center text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]"
          >
            Paket Anda
          </button>
        ) : price === 0 ? (
          <button
            type="button"
            disabled
            className="d-mono w-full rounded-full border border-[var(--d-line)] px-4 py-2.5 text-center text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]"
          >
            Paket Gratis
          </button>
        ) : (
          <Link
            href={upgradeHref}
            className={
              isElite
                ? "d-mono inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#D4B896_0%,#F4B8A3_100%)] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--d-bg-0)] shadow-[0_18px_40px_-18px_rgba(212,184,150,0.6)] transition-opacity hover:opacity-90"
                : "d-mono inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
            }
          >
            Pilih {name} →
          </Link>
        )}
      </div>
    </article>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="d-mono px-4 py-3 text-left text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
      {children}
    </th>
  );
}
