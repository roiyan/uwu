"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/lib/actions/profile";
import {
  publishEventAction,
  unpublishEventAction,
  updateEventSettingsAction,
} from "@/lib/actions/event";
import {
  createPartnerInvite,
  regenerateInviteLink,
  revokeCollaborator,
} from "@/lib/actions/collaborator";
import { useToast } from "@/components/shared/Toast";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { getWhatsAppShareUrl } from "@/lib/utils/share";

type Tab = "akun" | "acara" | "budaya" | "kolaborator";

// Underline-only inputs to match the dashboard dark idiom.
const inputClass =
  "mt-2 w-full bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[15px] text-[var(--d-ink)] outline-none placeholder:text-[var(--d-ink-faint)] focus:border-[var(--d-coral)] transition-colors";

const labelClass =
  "d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]";

const TABS: { id: Tab; label: string; numero: string }[] = [
  { id: "akun", label: "Profil", numero: "N° 01" },
  { id: "acara", label: "Acara", numero: "N° 02" },
  { id: "budaya", label: "Preferensi", numero: "N° 03" },
  { id: "kolaborator", label: "Kolaborasi", numero: "N° 04" },
];

export type CollaboratorRow = {
  id: string;
  invitedEmail: string | null;
  invitedName: string | null;
  acceptedEmail: string | null;
  inviteStatus: "pending" | "accepted" | "revoked" | "expired" | "expired_manual";
  inviteToken: string | null;
  invitedAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
};

export function SettingsTabs({
  active,
  eventId,
  isPublished,
  profile,
  event,
  owner,
  collaborators,
  origin,
}: {
  active: Tab;
  eventId: string;
  isPublished: boolean;
  profile: { email: string; fullName: string; phone: string };
  event: {
    title: string;
    slug: string;
    musicUrl: string;
    culturalPreference: "islami" | "umum" | "custom";
  };
  owner: { fullName: string | null; email: string; isCurrentUser: boolean };
  collaborators: CollaboratorRow[];
  origin: string;
}) {
  const activeTab = TABS.find((t) => t.id === active);
  return (
    <div className="space-y-8">
      {/* Tab strip — scrolls horizontally inside its own container.
          Previously the <nav> had `w-fit` which made the element
          itself wider than the viewport on mobile, causing the whole
          page to scroll right. The outer wrapper now caps the strip
          at viewport width and handles the swipe; the inner pill
          rail uses `w-max` so all tabs sit on a single row. The
          `-mx-5 px-5` negative-margin trick lets the scroll trough
          extend edge-to-edge on the mobile main padding. */}
      <div className="-mx-5 overflow-x-auto px-5 scrollbar-hide lg:mx-0 lg:px-0">
        <nav
          className="inline-flex w-max gap-1 rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.02)] p-1"
          aria-label="Pengaturan tabs"
        >
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/dashboard/settings?tab=${tab.id}`}
              className={`d-mono whitespace-nowrap rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors ${
                active === tab.id
                  ? "bg-[var(--d-bg-1)] text-[var(--d-ink)] shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
                  : "text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {activeTab && (
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
            {activeTab.numero} — {activeTab.label}
          </p>
        </div>
      )}

      {active === "akun" && <AkunTab profile={profile} />}
      {active === "acara" && (
        <AcaraTab eventId={eventId} isPublished={isPublished} event={event} />
      )}
      {active === "budaya" && <BudayaTab eventId={eventId} event={event} />}
      {active === "kolaborator" && (
        <KolaboratorTab
          eventId={eventId}
          owner={owner}
          collaborators={collaborators}
          origin={origin}
        />
      )}
    </div>
  );
}

function AkunTab({
  profile,
}: {
  profile: { email: string; fullName: string; phone: string };
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) toast.success("Profil diperbarui");
    else if (state && !state.ok) toast.error(state.error);
  }, [state, toast]);

  return (
    <form
      action={formAction}
      className="d-card space-y-7 p-7 md:p-9"
    >
      <header>
        <h2 className="d-serif text-[26px] font-extralight text-[var(--d-ink)]">
          Profil <em className="d-serif italic text-[var(--d-coral)]">Akun</em>
        </h2>
        <p className="mt-2 text-[13px] text-[var(--d-ink-dim)]">
          Identitas pengguna ini terhubung ke akun login Anda. Email tidak
          dapat diubah saat ini.
        </p>
      </header>

      <div className="grid gap-7 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className={labelClass}>
            Email <span className="ml-2 text-[var(--d-ink-faint)]">🔒</span>
          </span>
          <input
            value={profile.email}
            disabled
            className={`${inputClass} opacity-60`}
          />
          <span className="mt-2 block text-[11px] text-[var(--d-ink-faint)]">
            Email tidak dapat diubah saat ini.
          </span>
        </label>
        <label className="block">
          <span className={labelClass}>Nama lengkap</span>
          <input
            name="fullName"
            required
            defaultValue={profile.fullName}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>No. WhatsApp</span>
          <input
            name="phone"
            defaultValue={profile.phone}
            placeholder="+62 812 3456 7890"
            className={inputClass}
          />
        </label>
      </div>

      {state && !state.ok && (
        <p className="rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-md border border-[rgba(126,211,164,0.25)] bg-[rgba(126,211,164,0.08)] px-3 py-2 text-sm text-[var(--d-green)]">
          Profil diperbarui.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--d-line)] pt-6">
        <span className="d-mono inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--d-coral)]"
          />
          Tersimpan
        </span>
        <button
          type="submit"
          disabled={pending}
          className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </form>
  );
}

function AcaraTab({
  eventId,
  isPublished,
  event,
}: {
  eventId: string;
  isPublished: boolean;
  event: { title: string; slug: string; musicUrl: string; culturalPreference: "islami" | "umum" | "custom" };
}) {
  const bound = updateEventSettingsAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(bound, null);
  const [publishPending, startPublishTransition] = useTransition();
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) toast.success("Detail acara tersimpan");
    else if (state && !state.ok) toast.error(state.error);
  }, [state, toast]);

  return (
    <div className="space-y-6">
      <form action={formAction} className="d-card space-y-7 p-7 md:p-9">
        <header>
          <h2 className="d-serif text-[26px] font-extralight text-[var(--d-ink)]">
            Detail{" "}
            <em className="d-serif italic text-[var(--d-coral)]">Acara</em>
          </h2>
          <p className="mt-2 text-[13px] text-[var(--d-ink-dim)]">
            Judul, URL undangan, dan musik latar.
          </p>
        </header>

        <div className="grid gap-7 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className={labelClass}>Judul acara</span>
            <input
              name="title"
              required
              defaultValue={event.title}
              className={inputClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className={labelClass}>URL undangan</span>
            <div className="mt-2 flex items-center border-b border-[var(--d-line-strong)] py-2.5 focus-within:border-[var(--d-coral)]">
              <span className="d-mono mr-2 text-[12px] text-[var(--d-ink-faint)]">
                uwu.id/
              </span>
              <input
                name="slug"
                required
                defaultValue={event.slug}
                pattern="[a-z0-9\-]+"
                className="flex-1 bg-transparent text-[15px] text-[var(--d-ink)] outline-none placeholder:text-[var(--d-ink-faint)]"
              />
            </div>
            <span className="mt-2 block text-[11px] text-[var(--d-ink-faint)]">
              Hanya huruf kecil, angka, dan tanda minus.
            </span>
          </label>
          <label className="block md:col-span-2">
            <span className={labelClass}>URL musik latar</span>
            <input
              name="musicUrl"
              type="url"
              defaultValue={event.musicUrl}
              placeholder="https://…"
              className={inputClass}
            />
            <span className="mt-2 block text-[11px] text-[var(--d-ink-faint)]">
              Musik akan muted secara default. Tamu dapat mengaktifkan manual.
            </span>
          </label>
        </div>
        <input
          type="hidden"
          name="culturalPreference"
          value={event.culturalPreference}
        />

        {state && !state.ok && (
          <p className="rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
            {state.error}
          </p>
        )}
        {state && state.ok && (
          <p className="rounded-md border border-[rgba(126,211,164,0.25)] bg-[rgba(126,211,164,0.08)] px-3 py-2 text-sm text-[var(--d-green)]">
            Perubahan tersimpan.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--d-line)] pt-6">
          <span className="d-mono inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
            <span
              aria-hidden
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--d-coral)]"
            />
            Tersimpan
          </span>
          <button
            type="submit"
            disabled={pending}
            className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Menyimpan…" : "Simpan Detail"}
          </button>
        </div>
      </form>

      <section className="d-card p-7 md:p-9">
        <header>
          <h2 className="d-serif text-[24px] font-extralight text-[var(--d-ink)]">
            Publikasi
          </h2>
          <p className="mt-2 flex items-center gap-2 text-[13px] text-[var(--d-ink-dim)]">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{
                background: isPublished
                  ? "var(--d-green)"
                  : "var(--d-ink-faint)",
                boxShadow: isPublished
                  ? "0 0 12px rgba(126,211,164,0.6)"
                  : undefined,
              }}
            />
            {isPublished
              ? "Undangan aktif dan dapat diakses publik melalui URL."
              : "Undangan masih tersembunyi. Publikasikan untuk membagikan ke tamu."}
          </p>
        </header>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {isPublished ? (
            <button
              type="button"
              disabled={publishPending}
              onClick={() =>
                startPublishTransition(async () => {
                  await unpublishEventAction(eventId);
                })
              }
              className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] px-6 py-2.5 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] disabled:opacity-50"
            >
              {publishPending ? "Memproses…" : "Unpublish"}
            </button>
          ) : (
            <button
              type="button"
              disabled={publishPending}
              onClick={() =>
                startPublishTransition(async () => {
                  await publishEventAction(eventId);
                })
              }
              className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishPending ? "Memproses…" : "Publikasikan Undangan"}
            </button>
          )}
          <Link
            href={`/${event.slug}`}
            target="_blank"
            rel="noreferrer"
            className="d-mono text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-coral)]"
          >
            Buka URL undangan →
          </Link>
        </div>
      </section>
    </div>
  );
}

function BudayaTab({
  eventId,
  event,
}: {
  eventId: string;
  event: { title: string; slug: string; musicUrl: string; culturalPreference: "islami" | "umum" | "custom" };
}) {
  const bound = updateEventSettingsAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(bound, null);
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) toast.success("Preferensi budaya tersimpan");
    else if (state && !state.ok) toast.error(state.error);
  }, [state, toast]);

  // M-04 — landing page promises three tones; expose the "santai" flavor
  // via the existing `custom` enum with a friendlier label.
  const options: { id: "umum" | "islami" | "custom"; label: string; description: string }[] = [
    {
      id: "umum",
      label: "Formal & Puitis",
      description: "Tone netral formal. Musik default menyala. Template broadcast umum.",
    },
    {
      id: "islami",
      label: "Islami",
      description:
        "Pembuka Assalamu'alaikum. Musik default mute. Label akad: Akad Nikah.",
    },
    {
      id: "custom",
      label: "Santai & Hangat",
      description:
        "Nada personal dan akrab — cocok untuk undangan ke teman dekat dan keluarga.",
    },
  ];

  return (
    <form action={formAction} className="d-card space-y-7 p-7 md:p-9">
      <header>
        <h2 className="d-serif text-[26px] font-extralight text-[var(--d-ink)]">
          Preferensi{" "}
          <em className="d-serif italic text-[var(--d-coral)]">Budaya</em>
        </h2>
        <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
          Pengaturan ini memengaruhi template broadcast WhatsApp, label
          jadwal, dan tone AI copywriter.
        </p>
      </header>
      <input type="hidden" name="title" value={event.title} />
      <input type="hidden" name="slug" value={event.slug} />
      <input type="hidden" name="musicUrl" value={event.musicUrl} />

      <div className="grid gap-3">
        {options.map((opt) => {
          const checked = event.culturalPreference === opt.id;
          return (
            <label
              key={opt.id}
              className={`relative flex cursor-pointer items-start gap-4 rounded-[14px] border p-5 transition-all ${
                checked
                  ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.05)] shadow-[0_0_0_1px_var(--d-coral)_inset]"
                  : "border-[var(--d-line)] bg-[var(--d-bg-card)] hover:border-[var(--d-line-strong)] hover:bg-[var(--d-bg-2)]"
              }`}
            >
              <input
                type="radio"
                name="culturalPreference"
                value={opt.id}
                defaultChecked={checked}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  checked
                    ? "border-[var(--d-coral)] bg-[var(--d-coral)]"
                    : "border-[var(--d-line-strong)]"
                }`}
              >
                {checked && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              <span className="min-w-0">
                <span className="d-serif block text-[18px] font-light text-[var(--d-ink)]">
                  {opt.label}
                </span>
                <span className="mt-1 block text-[12px] leading-relaxed text-[var(--d-ink-dim)]">
                  {opt.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {state && !state.ok && (
        <p className="rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-md border border-[rgba(126,211,164,0.25)] bg-[rgba(126,211,164,0.08)] px-3 py-2 text-sm text-[var(--d-green)]">
          Preferensi tersimpan.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--d-line)] pt-6">
        <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
          Untuk preferensi tampilan & tema, buka{" "}
          <Link
            href="/dashboard/website/theme"
            className="text-[var(--d-coral)] hover:text-[var(--d-peach)]"
          >
            Tema Undangan →
          </Link>
        </p>
        <button
          type="submit"
          disabled={pending}
          className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Simpan Preferensi"}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Kolaborator tab
// ============================================================================

function KolaboratorTab({
  eventId,
  owner,
  collaborators,
  origin,
}: {
  eventId: string;
  owner: { fullName: string | null; email: string; isCurrentUser: boolean };
  collaborators: CollaboratorRow[];
  origin: string;
}) {
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<CollaboratorRow | null>(null);
  const [revokePending, startRevoke] = useTransition();

  const hasAny = collaborators.length > 0;

  function handleRevokeConfirm() {
    if (!confirmRevoke) return;
    const target = confirmRevoke;
    startRevoke(async () => {
      const res = await revokeCollaborator(target.id);
      if (res.ok) {
        toast.success("Akses dicabut");
        setConfirmRevoke(null);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="d-card p-7 md:p-9">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="d-serif text-[26px] font-extralight text-[var(--d-ink)]">
              Kelola{" "}
              <em className="d-serif italic text-[var(--d-coral)]">
                bersama
              </em>
            </h2>
            <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
              Undang pasangan agar bisa mengedit undangan bersama. Mereka
              dapat mengedit konten tetapi tidak bisa mengelola pembayaran
              atau menghapus acara.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
          >
            + Undang Pasangan
          </button>
        </header>

        <div className="mt-7 space-y-3">
          {/* Owner — always shown */}
          <CollabCard
            avatarInitials={initials(owner.fullName ?? owner.email)}
            name={owner.fullName ?? owner.email}
            subtitle={owner.email}
            roleLabel="Pemilik (Owner)"
            accent="owner"
            rightBadge={owner.isCurrentUser ? "ANDA" : null}
          />

          {collaborators.map((c) => (
            <CollaboratorCardRow
              key={c.id}
              row={c}
              inviteUrl={
                c.inviteToken ? `${origin}/invite/${c.inviteToken}` : null
              }
              onRevoke={() => setConfirmRevoke(c)}
            />
          ))}

          {!hasAny && (
            <div className="rounded-[14px] border border-dashed border-[var(--d-line-strong)] bg-transparent p-6 text-center text-[13px] text-[var(--d-ink-dim)]">
              Belum ada kolaborator. Undang pasangan Anda agar bisa
              mengelola undangan bersama.
            </div>
          )}
        </div>
      </section>

      <InviteDialog
        open={inviteOpen}
        eventId={eventId}
        onClose={() => setInviteOpen(false)}
      />

      <ConfirmDialog
        open={confirmRevoke !== null}
        title={
          confirmRevoke
            ? `Hapus akses ${
                confirmRevoke.invitedName ?? confirmRevoke.invitedEmail ?? "pasangan"
              }?`
            : "Hapus akses?"
        }
        description="Mereka tidak akan bisa mengelola undangan lagi. Tindakan ini bisa dibatalkan dengan mengirim ulang undangan."
        loading={revokePending}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setConfirmRevoke(null)}
        confirmLabel="Hapus Akses"
      />
    </div>
  );
}

function CollaboratorCardRow({
  row,
  inviteUrl,
  onRevoke,
}: {
  row: CollaboratorRow;
  inviteUrl: string | null;
  onRevoke: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const displayName =
    row.invitedName ?? row.acceptedEmail ?? row.invitedEmail ?? "Pasangan";

  function copyLink() {
    if (!inviteUrl) return;
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => toast.success("Link disalin"))
      .catch(() => toast.error("Tidak bisa menyalin link."));
  }

  function regenerate() {
    startTransition(async () => {
      const res = await regenerateInviteLink(row.id);
      if (res.ok) toast.success("Link undangan baru dibuat");
      else toast.error(res.error);
    });
  }

  if (row.inviteStatus === "accepted") {
    const mismatch =
      row.acceptedEmail &&
      row.invitedEmail &&
      row.acceptedEmail.toLowerCase() !== row.invitedEmail.toLowerCase();
    return (
      <CollabCard
        avatarInitials={initials(displayName)}
        name={displayName}
        subtitle={
          mismatch
            ? `Diundang: ${row.invitedEmail}`
            : row.acceptedEmail ?? row.invitedEmail ?? "—"
        }
        roleLabel="Mempelai (Partner)"
        accent="partner"
        status={
          mismatch ? (
            <>
              <p className="mt-1 text-xs text-[color:var(--color-error)]">
                ⚠️ Bergabung dengan: {row.acceptedEmail} · tidak sesuai undangan
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-[color:var(--color-success)]">
              ✓ Bergabung{" "}
              {row.acceptedAt
                ? new Date(row.acceptedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : ""}
            </p>
          )
        }
        actions={
          <button
            type="button"
            onClick={onRevoke}
            className="rounded-full border border-rose/30 px-3 py-1 text-xs font-medium text-[var(--d-coral)] transition-colors hover:border-rose hover:border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)]"
          >
            🗑 Hapus Akses
          </button>
        }
      />
    );
  }

  // Pending
  const expiryLabel = row.expiresAt
    ? new Date(row.expiresAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  const invitedAtLabel = new Date(row.invitedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

  return (
    <CollabCard
      avatarInitials={initials(displayName)}
      name={displayName}
      subtitle={row.invitedEmail ?? "—"}
      roleLabel="Mempelai (Partner)"
      accent="partner"
      status={
        <p className="mt-1 text-xs text-[color:var(--color-warning)]">
          ⏳ Menunggu bergabung (dikirim {invitedAtLabel}
          {expiryLabel ? ` · berlaku sampai ${expiryLabel}` : ""})
        </p>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {inviteUrl && (
            <>
              <button
                type="button"
                onClick={copyLink}
                className="rounded-full border border-[var(--d-coral)]/25 px-3 py-1 text-xs font-medium text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)]/5"
              >
                📋 Salin Link
              </button>
              <a
                href={getWhatsAppShareUrl(displayName, inviteUrl)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                💬 WhatsApp
              </a>
            </>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={regenerate}
            className="rounded-full border border-[var(--d-coral)]/25 px-3 py-1 text-xs font-medium text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)]/5 disabled:opacity-60"
          >
            {pending ? "Memproses..." : "🔄 Buat Link Baru"}
          </button>
          <button
            type="button"
            onClick={onRevoke}
            className="rounded-full border border-rose/30 px-3 py-1 text-xs font-medium text-[var(--d-coral)] transition-colors hover:border-rose hover:border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)]"
          >
            🗑 Batalkan
          </button>
        </div>
      }
    />
  );
}

function CollabCard({
  avatarInitials,
  name,
  subtitle,
  roleLabel,
  accent,
  status,
  actions,
  rightBadge,
}: {
  avatarInitials: string;
  name: string;
  subtitle: string;
  roleLabel: string;
  accent: "owner" | "partner";
  status?: React.ReactNode;
  actions?: React.ReactNode;
  rightBadge?: string | null;
}) {
  const avatarBg =
    accent === "owner" ? "bg-[var(--d-bg-2)] text-white" : "bg-[rgba(212,184,150,0.10)] text-[var(--d-gold)]";
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[var(--d-line)] bg-[var(--d-bg-card)] p-4 md:flex-row md:items-center md:gap-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${avatarBg}`}
        aria-hidden
      >
        {avatarInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-[var(--d-ink)]">{name}</p>
          {rightBadge && (
            <span className="rounded-full bg-[rgba(143,163,217,0.08)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--d-ink)]">
              {rightBadge}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-[var(--d-ink-dim)]">{subtitle}</p>
        {status}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-[var(--d-bg-2)] px-3 py-1 text-xs font-medium text-[var(--d-ink-dim)] md:inline-flex">
          {roleLabel}
        </span>
        {actions}
      </div>
    </article>
  );
}

function InviteDialog({
  open,
  eventId,
  onClose,
}: {
  open: boolean;
  eventId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
    }
  }, [open]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const res = await createPartnerInvite({
        eventId,
        partnerEmail: email,
        partnerName: name,
      });
      if (res.ok) {
        toast.success("Undangan dibuat");
        onClose();
        // createPartnerInvite no longer revalidates (see collaborator.ts),
        // so refresh the page so the new pending invite appears in the list.
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-[color:var(--overlay-modal)]"
        onClick={pending ? undefined : onClose}
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-lg"
      >
        <h2 className="font-display text-xl text-[var(--d-ink)]">Undang Pasangan</h2>
        <p className="mt-1 text-sm text-[var(--d-ink-dim)]">
          Kirim link undangan agar pasangan Anda bisa mengelola acara bersama.
        </p>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--d-ink)]">
              Email pasangan <span className="text-[var(--d-coral)]">*</span>
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--d-ink)]">Nama (opsional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rizky Pratama"
              className={inputClass}
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-sm font-medium text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-gradient-brand px-6 py-2 text-sm font-medium text-white shadow-[0_6px_20px_-6px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {pending ? "Memproses..." : "Kirim Undangan"}
          </button>
        </div>
      </form>
    </div>
  );
}

function initials(s: string) {
  return s
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
