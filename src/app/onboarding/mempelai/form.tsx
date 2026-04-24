"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMempelaiAction } from "@/lib/actions/onboarding";
import { useToast } from "@/components/shared/Toast";

type OwnerRole = "bride" | "groom" | "both";
type Side = "bride" | "groom";

type Defaults = {
  brideName: string;
  brideNickname: string | null;
  groomName: string;
  groomNickname: string | null;
  ownerRole: OwnerRole;
  partnerEmail: string;
};

// A-2 — lifted contrast on every form control so inputs are clearly
// distinguishable from the dark card surface underneath.
const inputClass =
  "mt-1 w-full rounded-xl border border-white/[0.12] bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 transition-colors focus:border-[color:var(--color-brand-lavender)]/60 focus:ring-2 focus:ring-[color:var(--color-brand-lavender)]/20";

const lockedClass =
  "mt-1 flex w-full items-center gap-2 rounded-xl border border-[color:var(--color-brand-lavender)]/25 bg-[color:var(--color-brand-lavender)]/[0.08] px-4 py-3 text-sm text-white/85";

const ROLE_OPTIONS: { id: OwnerRole; icon: string; label: string }[] = [
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
  const [partnerEmail, setPartnerEmail] = useState<string>(defaults.partnerEmail);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const form = new FormData(e.currentTarget);
    form.set("ownerRole", ownerRole);
    form.set(
      "partnerEmail",
      ownerRole === "both" ? "" : partnerEmail.trim().toLowerCase(),
    );

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

  // Single source of truth for email placement.
  //   role=bride  → locked in Wanita, partner in Pria
  //   role=groom  → locked in Pria,   partner in Wanita
  //   role=both   → neither
  const lockedSide: Side | null =
    ownerRole === "bride" ? "bride" : ownerRole === "groom" ? "groom" : null;
  const partnerSide: Side | null =
    ownerRole === "bride" ? "groom" : ownerRole === "groom" ? "bride" : null;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {/* Saya adalah — role selector */}
      <section className="rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-6 shadow-2xl">
        <h2 className="font-display text-lg text-white/90">Saya adalah</h2>
        <p className="mt-1 text-xs text-white/50">
          Pilihan ini menentukan email mana yang terhubung dengan akun Anda.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map((opt) => (
            <RolePill
              key={opt.id}
              active={ownerRole === opt.id}
              icon={opt.icon}
              label={opt.label}
              onClick={() => setOwnerRole(opt.id)}
            />
          ))}
        </div>
      </section>

      <CoupleSection
        side="bride"
        title="Mempelai Wanita"
        nameName="brideName"
        nicknameName="brideNickname"
        namePlaceholder="Anisa Putri Larasati"
        nicknamePlaceholder="Anisa"
        defaultName={defaults.brideName}
        defaultNickname={defaults.brideNickname}
        accountEmail={accountEmail}
        lockedSide={lockedSide}
        partnerSide={partnerSide}
        partnerEmail={partnerEmail}
        setPartnerEmail={setPartnerEmail}
      />

      <CoupleSection
        side="groom"
        title="Mempelai Pria"
        nameName="groomName"
        nicknameName="groomNickname"
        namePlaceholder="Rizky Pratama Hidayat"
        nicknamePlaceholder="Rizky"
        defaultName={defaults.groomName}
        defaultNickname={defaults.groomNickname}
        accountEmail={accountEmail}
        lockedSide={lockedSide}
        partnerSide={partnerSide}
        partnerEmail={partnerEmail}
        setPartnerEmail={setPartnerEmail}
      />

      {error && (
        <p className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
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

function CoupleSection(props: {
  side: Side;
  title: string;
  nameName: string;
  nicknameName: string;
  namePlaceholder: string;
  nicknamePlaceholder: string;
  defaultName: string;
  defaultNickname: string | null;
  accountEmail: string;
  lockedSide: Side | null;
  partnerSide: Side | null;
  partnerEmail: string;
  setPartnerEmail: (v: string) => void;
}) {
  const showLocked = props.lockedSide === props.side;
  const showPartner = props.partnerSide === props.side;

  return (
    <section className="rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-6 shadow-2xl">
      <h2 className="font-display text-lg text-white/90">{props.title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-white/70">Nama lengkap</span>
          <input
            name={props.nameName}
            required
            defaultValue={props.defaultName}
            placeholder={props.namePlaceholder}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-white/70">Nama panggilan</span>
          <input
            name={props.nicknameName}
            defaultValue={props.defaultNickname ?? ""}
            placeholder={props.nicknamePlaceholder}
            className={inputClass}
          />
        </label>

        {showLocked && (
          <div className="md:col-span-2">
            <span className="text-sm font-medium text-white/70">Email</span>
            <div className={lockedClass}>
              <span aria-hidden>📧</span>
              <span className="truncate">{props.accountEmail || "—"}</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-white/60">
                Akun Anda <span aria-hidden>🔒</span>
              </span>
            </div>
          </div>
        )}

        {showPartner && (
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-white/70">
              Email pasangan (opsional)
            </span>
            <input
              type="email"
              value={props.partnerEmail}
              onChange={(e) => props.setPartnerEmail(e.target.value)}
              placeholder="Masukkan email pasangan Anda"
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-white/50">
              Jika diisi, pasangan bisa ikut mengelola undangan dari akun mereka
              sendiri.
            </span>
          </label>
        )}
      </div>
    </section>
  );
}

function RolePill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  // A-3 — prominent active state: brand-lavender 2px border + soft outer glow.
  const activeStyle: React.CSSProperties | undefined = active
    ? {
        borderColor: "var(--color-brand-lavender)",
        boxShadow:
          "0 0 0 1px rgba(184,160,208,0.35), 0 0 24px -4px rgba(184,160,208,0.25)",
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-6 py-3 text-sm transition-all ${
        active
          ? "bg-white/[0.08] text-white"
          : "border-white/[0.1] bg-white/[0.03] text-white/70 hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-white"
      }`}
      style={activeStyle}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}
