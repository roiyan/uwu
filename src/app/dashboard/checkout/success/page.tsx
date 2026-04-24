import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionUserFast } from "@/lib/auth-guard";
import {
  getOrderByRefAction,
  simulateOrderSettlementAction,
} from "@/lib/actions/checkout";

type Search = { order_id?: string; simulated?: string };

function formatIdr(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Pembayaran",
  paid: "Berhasil Dibayar",
  expired: "Kedaluwarsa",
  canceled: "Dibatalkan",
  failed: "Gagal",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireSessionUserFast();
  const params = await searchParams;
  const orderRef = params.order_id;
  if (!orderRef) redirect("/dashboard/packages");

  if (params.simulated === "1") {
    await simulateOrderSettlementAction(orderRef);
  }

  const row = await getOrderByRefAction(orderRef);
  if (!row) redirect("/dashboard/packages");

  const paid = row.order.status === "paid";

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <section className="mx-auto max-w-lg rounded-2xl bg-surface-card p-8 text-center shadow-ghost-md">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            paid ? "bg-[#E8F3EE] text-[#3B7A57]" : "bg-gold-50 text-gold-dark"
          }`}
        >
          {paid ? "♡" : "…"}
        </div>
        <h1 className="mt-4 font-display text-3xl text-ink">
          {paid ? "Pembayaran Berhasil" : "Menunggu Pembayaran"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {paid
            ? `Paket ${row.pkg?.name} sudah aktif untuk acara Anda.`
            : "Kami akan memperbarui status secara otomatis setelah pembayaran diterima."}
        </p>

        <dl className="mt-6 space-y-2 rounded-xl bg-surface-muted/60 p-4 text-left text-sm">
          <Row label="Order ID" value={row.order.orderRef} />
          <Row label="Paket" value={row.pkg?.name ?? "—"} />
          <Row label="Jumlah" value={formatIdr(row.order.amountIdr)} />
          <Row label="Status" value={STATUS_LABEL[row.order.status] ?? row.order.status} />
          {row.order.midtransPaymentType && (
            <Row label="Metode" value={row.order.midtransPaymentType} />
          )}
        </dl>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="rounded-full bg-coral px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark"
          >
            Kembali ke Dashboard
          </Link>
          <Link
            href="/dashboard/packages"
            className="rounded-full border border-[color:var(--border-medium)] px-6 py-3 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
          >
            Lihat Riwayat Paket
          </Link>
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="truncate font-medium text-ink">{value}</dd>
    </div>
  );
}
