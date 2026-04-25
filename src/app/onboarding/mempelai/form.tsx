"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMempelaiAction } from "@/lib/actions/onboarding";
import { useToast } from "@/components/shared/Toast";
import { writePreview } from "../components/preview-store";

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

const ROLE_OPTIONS: {
  id: OwnerRole;
  icon: string;
  label: string;
  hint: string;
}[] = [
  {
    id: "bride",
    icon: "♀",
    label: "Mempelai Wanita",
    hint: "Email terhubung ke akun wanita",
  },
  {
    id: "groom",
    icon: "♂",
    label: "Mempelai Pria",
    hint: "Email terhubung ke akun pria",
  },
  {
    id: "both",
    icon: "&",
    label: "Kami isi berdua",
    hint: "Tanpa email pasangan tambahan",
  },
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

  // role=bride  → locked in Wanita, partner in Pria
  // role=groom  → locked in Pria,   partner in Wanita
  // role=both   → neither
  const lockedSide: Side | null =
    ownerRole === "bride" ? "bride" : ownerRole === "groom" ? "groom" : null;
  const partnerSide: Side | null =
    ownerRole === "bride" ? "groom" : ownerRole === "groom" ? "bride" : null;

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-7">
      <fieldset>
        <legend className="ob-mono mb-4 block text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)]">
          Saya adalah
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLE_OPTIONS.map((opt) => (
            <RolePill
              key={opt.id}
              active={ownerRole === opt.id}
              icon={opt.icon}
              label={opt.label}
              hint={opt.hint}
              onClick={() => setOwnerRole(opt.id)}
            />
          ))}
        </div>
      </fieldset>

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
        <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--ob-line)] pt-6">
        <span className="ob-mono inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-faint)]">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ob-coral)]"
          />
          Tersimpan otomatis
        </span>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-3 text-[13px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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

  // Local state mirrors the inputs so we can push to the preview
  // store without making the inputs fully controlled (defaultValue
  // remains the source of truth on submit). This keeps the existing
  // form-data flow intact while giving the sidebar a live preview.
  const [name, setName] = useState(props.defaultName);
  const [nickname, setNickname] = useState(props.defaultNickname ?? "");

  return (
    <section className="rounded-[18px] border border-[var(--ob-line)] bg-[var(--ob-bg-card)] p-6 md:p-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h3 className="ob-serif text-[22px] font-light text-[var(--ob-ink)]">
          {props.title}
        </h3>
        <span className="ob-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-faint)]">
          {props.side === "bride" ? "Wanita" : "Pria"}
        </span>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="block">
          <span className="ob-eyebrow block">Nama lengkap</span>
          <input
            name={props.nameName}
            required
            defaultValue={props.defaultName}
            placeholder={props.namePlaceholder}
            className="ob-input"
            onChange={(e) => {
              setName(e.target.value);
              writePreview(
                props.side === "bride"
                  ? { brideName: e.target.value }
                  : { groomName: e.target.value },
              );
            }}
            value={name}
          />
        </label>
        <label className="block">
          <span className="ob-eyebrow block">Nama panggilan</span>
          <input
            name={props.nicknameName}
            defaultValue={props.defaultNickname ?? ""}
            placeholder={props.nicknamePlaceholder}
            className="ob-input"
            onChange={(e) => {
              setNickname(e.target.value);
              writePreview(
                props.side === "bride"
                  ? { brideNickname: e.target.value }
                  : { groomNickname: e.target.value },
              );
            }}
            value={nickname}
          />
        </label>

        {showLocked && (
          <div className="md:col-span-2">
            <span className="ob-eyebrow block">Email</span>
            <div className="mt-2 flex items-center gap-3 rounded-md border border-[var(--ob-line-strong)] bg-[rgba(240,160,156,0.04)] px-4 py-3 text-sm text-[var(--ob-ink)]">
              <span aria-hidden>📧</span>
              <span className="truncate font-mono text-[12px]">
                {props.accountEmail || "—"}
              </span>
              <span className="ob-mono ml-auto flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)]">
                Akun Anda <span aria-hidden>🔒</span>
              </span>
            </div>
          </div>
        )}

        {showPartner && (
          <label className="block md:col-span-2">
            <span className="ob-eyebrow block">
              Email pasangan (opsional)
            </span>
            <input
              type="email"
              value={props.partnerEmail}
              onChange={(e) => props.setPartnerEmail(e.target.value)}
              placeholder="email@pasangan.com"
              className="ob-input"
            />
            <span className="mt-2 block text-[12px] text-[var(--ob-ink-dim)]">
              Jika diisi, pasangan bisa ikut mengelola undangan dari akun
              mereka sendiri.
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
  hint,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-1 rounded-[14px] border p-5 text-left transition-all ${
        active
          ? "border-[var(--ob-coral)] bg-[rgba(240,160,156,0.05)] shadow-[0_0_0_1px_var(--ob-coral)_inset,0_10px_40px_rgba(240,160,156,0.12)]"
          : "border-[var(--ob-line)] bg-[var(--ob-bg-card)] hover:border-[var(--ob-line-strong)] hover:bg-[var(--ob-bg-2)]"
      }`}
    >
      <span
        className="ob-serif text-[26px] italic"
        style={{ color: active ? "var(--ob-coral)" : "var(--ob-ink-dim)" }}
      >
        {icon}
      </span>
      <span className="ob-serif mt-1 text-[15px] text-[var(--ob-ink)]">
        {label}
      </span>
      <span className="text-[11px] text-[var(--ob-ink-dim)]">{hint}</span>
    </button>
  );
}
