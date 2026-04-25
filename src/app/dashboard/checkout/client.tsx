"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCheckoutAction } from "@/lib/actions/checkout";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

export function CheckoutClient({
  tier,
  packageName,
  amount,
  formattedAmount,
  snapJsUrl,
  clientKey,
  midtransConfigured,
}: {
  tier: string;
  packageName: string;
  amount: number;
  formattedAmount: string;
  snapJsUrl: string;
  clientKey: string;
  midtransConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCheckout() {
    setError(null);
    start(async () => {
      const res = await createCheckoutAction(tier);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const { token, redirectUrl, simulated, orderRef } = res.data!;

      if (simulated || !midtransConfigured) {
        router.push(
          `/dashboard/checkout/success?order_id=${orderRef}&simulated=1`,
        );
        return;
      }

      if (window.snap && clientKey) {
        window.snap.pay(token, {
          onSuccess: () =>
            router.push(`/dashboard/checkout/success?order_id=${orderRef}`),
          onPending: () =>
            router.push(`/dashboard/checkout/success?order_id=${orderRef}`),
          onError: (result) => {
            console.error("[snap.onError]", result);
            setError("Pembayaran belum berhasil. Silakan coba lagi.");
          },
          onClose: () => setError("Anda menutup popup sebelum pembayaran selesai."),
        });
      } else {
        window.location.href = redirectUrl;
      }
    });
  }

  return (
    <div>
      {clientKey && (
        <Script src={snapJsUrl} data-client-key={clientKey} strategy="afterInteractive" />
      )}

      <h2 className="font-display text-xl text-[var(--d-ink)]">Ringkasan Pembayaran</h2>
      <div className="mt-4 space-y-3 text-sm">
        <Row label="Paket" value={packageName} />
        <Row label="Jumlah" value={`1 × ${formattedAmount}`} />
        <Row label="Metode" value="Pilih di popup Midtrans" muted />
      </div>

      <hr className="my-5 border-[var(--d-line)]" />

      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--d-ink-dim)]">Total biaya</span>
        <span className="font-display text-2xl text-[var(--d-ink)]">{formattedAmount}</span>
      </div>

      {!midtransConfigured && (
        <div className="mt-5 rounded-lg bg-[rgba(212,184,150,0.10)] px-4 py-3 text-xs text-[var(--d-gold)]">
          Mode simulasi aktif: Midtrans belum dikonfigurasi di environment.
          Pembayaran akan ditandai berhasil tanpa proses pembayaran sungguhan.
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={pending || amount <= 0}
        className="mt-6 w-full rounded-full bg-coral px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Memproses..." : "Bayar Sekarang"}
      </button>

      <p className="mt-3 text-center text-[11px] text-[var(--d-ink-faint)]">
        Dengan melanjutkan Anda menyetujui{" "}
        <a
          href="/terms"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-[var(--d-ink)]"
        >
          ketentuan layanan
        </a>{" "}
        uwu.
      </p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--d-ink-dim)]">{label}</span>
      <span className={muted ? "text-[var(--d-ink-faint)]" : "font-medium text-[var(--d-ink)]"}>{value}</span>
    </div>
  );
}
