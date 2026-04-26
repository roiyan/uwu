"use client";

import { useState, useTransition } from "react";
import {
  submitGiftConfirmationAction,
  type PublicGiftAccount,
} from "@/lib/actions/gift";

type Palette = { primary: string; secondary: string; accent: string };

export function GiftSection({
  eventId,
  accounts,
  palette,
}: {
  eventId: string;
  accounts: PublicGiftAccount[];
  palette: Palette;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (accounts.length === 0) return null;

  function copy(text: string, id: string) {
    if (typeof navigator === "undefined") return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000);
      })
      .catch(() => undefined);
  }

  function submit() {
    setErr(null);
    if (!name.trim()) {
      setErr("Mohon isi nama Anda dulu.");
      return;
    }
    const parsedAmount = amount ? Number(amount.replace(/\D/g, "")) : undefined;
    startTransition(async () => {
      const res = await submitGiftConfirmationAction({
        eventId,
        guestName: name.trim(),
        guestMessage: message.trim() || undefined,
        accountId: accountId || undefined,
        amount: parsedAmount,
      });
      if (res.ok) {
        setDone(true);
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <section
      id="amplop"
      className="px-6 py-14"
      style={{ color: palette.primary }}
    >
      <div className="mx-auto max-w-[440px] text-center">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.32em]"
          style={{ color: palette.primary, opacity: 0.75 }}
        >
          Tanda Kasih
        </p>
        <h2
          className="mt-3 font-serif text-[28px] font-light leading-[1.2]"
          style={{ color: palette.primary }}
        >
          Doa dan restu Anda adalah hadiah <em>terindah</em> bagi kami.
        </h2>
        <p
          className="mt-3 font-serif text-[13.5px] italic leading-relaxed"
          style={{ color: palette.primary, opacity: 0.75 }}
        >
          Bagi yang ingin menitipkan tanda kasih, silakan melalui:
        </p>
      </div>

      <div className="mx-auto mt-6 grid max-w-[440px] gap-3">
        {accounts.map((a) => (
          <article
            key={a.id}
            className="rounded-[14px] border p-4"
            style={{
              borderColor: palette.accent + "55",
              background: palette.secondary,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[16px]"
                style={{ background: palette.accent + "33" }}
              >
                {a.type === "bank" ? "🏦" : "📱"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{a.provider}</p>
                <p className="text-[11.5px] opacity-70">a.n. {a.accountName}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <code
                className="break-all font-mono text-[14px] tracking-[0.04em]"
                style={{ color: palette.primary }}
              >
                {a.accountNumber}
              </code>
              <button
                type="button"
                onClick={() => copy(a.accountNumber, a.id)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em]"
                style={{
                  background: palette.primary,
                  color: palette.secondary,
                }}
              >
                {copiedId === a.id ? "Tersalin ✓" : "Salin Nomor"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-[440px]">
        {done ? (
          <div
            className="rounded-[14px] border p-5 text-center"
            style={{
              borderColor: palette.accent + "66",
              background: palette.secondary,
            }}
          >
            <p
              className="font-serif text-[15px] italic leading-relaxed"
              style={{ color: palette.primary }}
            >
              Terima kasih atas tanda kasih Anda.
              <br />
              Doa Anda sangat berarti bagi kami. ♡
            </p>
          </div>
        ) : (
          <div
            className="rounded-[14px] border p-5"
            style={{
              borderColor: palette.accent + "55",
              background: palette.secondary,
            }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-[0.28em] opacity-80"
              style={{ color: palette.primary }}
            >
              Kabarkan kami
            </p>
            <p
              className="mt-1.5 font-serif text-[12.5px] italic leading-relaxed"
              style={{ color: palette.primary, opacity: 0.7 }}
            >
              Agar kami bisa mengucapkan terima kasih secara personal.
            </p>
            <div className="mt-4 grid gap-3">
              <Field label="Dari siapa tanda kasih ini?">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-[14px] outline-none"
                  style={{ borderColor: palette.accent + "55" }}
                  placeholder="Nama Anda"
                />
              </Field>
              <Field label="Dikirim ke mana?">
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full appearance-none rounded-lg border bg-white px-3 py-2 text-[14px] outline-none"
                  style={{ borderColor: palette.accent + "55" }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.provider} — {a.accountName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nominal — tidak wajib diisi">
                <input
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  inputMode="numeric"
                  className="w-full rounded-lg border bg-white px-3 py-2 text-[14px] outline-none"
                  style={{ borderColor: palette.accent + "55" }}
                  placeholder="500000"
                />
              </Field>
              <Field label="Titipkan doa atau ucapan">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-[14px] outline-none"
                  style={{ borderColor: palette.accent + "55" }}
                  placeholder="Selamat berbahagia, semoga…"
                />
              </Field>
            </div>
            {err && (
              <p
                className="mt-3 text-[12.5px]"
                style={{ color: palette.primary }}
              >
                {err}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="mt-5 w-full rounded-full px-5 py-2.5 text-[12px] font-medium uppercase tracking-[0.22em] transition-opacity disabled:opacity-50"
              style={{
                background: palette.primary,
                color: palette.secondary,
              }}
            >
              {pending ? "Mengirim…" : "Kirimkan ♡"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-medium uppercase tracking-[0.22em] opacity-70">
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
