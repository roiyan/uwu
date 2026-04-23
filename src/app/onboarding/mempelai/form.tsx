"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMempelaiAction } from "@/lib/actions/onboarding";
import { useToast } from "@/components/shared/Toast";

type OwnerRole = "bride" | "groom" | "both";

type Defaults = {
  brideName: string;
  brideNickname: string | null;
  groomName: string;
  groomNickname: string | null;
  ownerRole: OwnerRole;
  partnerEmail: string;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[color:var(--color-brand-lavender)]/50 focus:ring-2 focus:ring-[color:var(--color-brand-lavender)]/30";

const lockedClass =
  "mt-1 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80";

const ROLE_OPTIONS: {
  id: OwnerRole;
  icon: string;
  label: string;
}[] = [
  { id: "bride", icon: "♀", label: "Mempelai Wanita" },
  { id: "groom", icon: "♂", label: "Mempelai Pria" },
  { id: "both", icon: "👫", label: "Kami isi berdua" },
];

export function MempelaiForm({
  defaults,
  accountEmail,
}: {
  defaults: Defaults;
  accountEmail: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerRole, setOwnerRole] = useState<OwnerRole>(defaults.ownerRole);
  const [partnerEmail, setPartnerEmail] = useState<string>(
    defaults.partnerEmail,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const form = new FormData(e.currentTarget);
    form.set("ownerRole", ownerRole);
    // Clear partnerEmail on "both" so we don't create an invite for nobody.
    if (ownerRole === "both") {
      form.set("partnerEmail", "");
    } else {
      form.set("partnerEmail", partnerEmail.trim().toLowerCase());
    }

    setError(null);
    setPending(true);
    toast.success("Tersimpan");

    saveMempelaiAction(null, form)
      .then((res) => {
        if (res.ok) {
          router.push(res.data!.next);
        } else {
          setError(res.error);
          toast.error(res.error);
          setPending(false);
        }
      })
      .catch(() => {
        toast.error("Koneksi gagal. Silakan coba lagi.");
        setPending(false);
      });
  }

  const brideIsAccount = ownerRole === "bride";
  const groomIsAccount = ownerRole === "groom";
  const showPartnerEmail = ownerRole !== "both";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {/* Saya adalah — role selector */}
      <section className="rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-6 shadow-2xl">
        <h2 className="font-display text-lg text-white/90">Saya adalah</h2>
        <p className="mt-1 text-xs text-white/50">
          Pilihan ini menentukan email mana yang terhubung dengan akun Anda.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map((opt) => {
            const active = ownerRole === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setOwnerRole(opt.id)}
                className={`relative rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  active
                    ? "border-transparent text-white"
                    : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:text-white"
                }`}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(var(--color-dark-surface), var(--color-dark-surface)) padding-box, var(--brand-gradient) border-box",
                        border: "1.5px solid transparent",
                      }
                    : undefined
                }
                aria-pressed={active}
              >
                <span className="mr-2 text-base">{opt.icon}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Mempelai Wanita */}
      <section className="rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-6 shadow-2xl">
        <h2 className="font-display text-lg text-white/90">Mempelai Wanita</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-white/70">Nama lengkap</span>
            <input
              name="brideName"
              required
              defaultValue={defaults.brideName}
              placeholder="Anisa Putri Larasati"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-white/70">Nama panggilan</span>
            <input
              name="brideNickname"
              defaultValue={defaults.brideNickname ?? ""}
              placeholder="Anisa"
              className={inputClass}
            />
          </label>
          {brideIsAccount && (
            <div className="md:col-span-2">
              <span className="text-sm font-medium text-white/70">Email</span>
              <div className={lockedClass}>
                <span aria-hidden>📧</span>
                <span className="truncate">{accountEmail || "—"}</span>
                <span className="ml-auto flex items-center gap-1 text-xs text-white/50">
                  Akun Anda <span aria-hidden>🔒</span>
                </span>
              </div>
            </div>
          )}
          {groomIsAccount && showPartnerEmail && (
            <PartnerEmailField
              value={partnerEmail}
              onChange={setPartnerEmail}
              label="Email pasangan (opsional)"
            />
          )}
        </div>
      </section>

      {/* Mempelai Pria */}
      <section className="rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-6 shadow-2xl">
        <h2 className="font-display text-lg text-white/90">Mempelai Pria</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-white/70">Nama lengkap</span>
            <input
              name="groomName"
              required
              defaultValue={defaults.groomName}
              placeholder="Rizky Pratama Hidayat"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-white/70">Nama panggilan</span>
            <input
              name="groomNickname"
              defaultValue={defaults.groomNickname ?? ""}
              placeholder="Rizky"
              className={inputClass}
            />
          </label>
          {groomIsAccount && (
            <div className="md:col-span-2">
              <span className="text-sm font-medium text-white/70">Email</span>
              <div className={lockedClass}>
                <span aria-hidden>📧</span>
                <span className="truncate">{accountEmail || "—"}</span>
                <span className="ml-auto flex items-center gap-1 text-xs text-white/50">
                  Akun Anda <span aria-hidden>🔒</span>
                </span>
              </div>
            </div>
          )}
          {brideIsAccount && showPartnerEmail && (
            <PartnerEmailField
              value={partnerEmail}
              onChange={setPartnerEmail}
              label="Email pasangan (opsional)"
            />
          )}
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-8 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          <span>{pending ? "Menyimpan..." : "Selanjutnya →"}</span>
        </button>
      </div>
    </form>
  );
}

function PartnerEmailField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-medium text-white/70">{label}</span>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Masukkan email pasangan Anda"
        className={inputClass}
      />
      <span className="mt-1 block text-xs text-white/50">
        Jika diisi, pasangan bisa ikut mengelola undangan dari akun mereka sendiri.
      </span>
    </label>
  );
}
