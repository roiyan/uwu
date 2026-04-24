"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
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

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

const TABS: { id: Tab; label: string }[] = [
  { id: "akun", label: "Akun" },
  { id: "acara", label: "Acara" },
  { id: "budaya", label: "Budaya" },
  { id: "kolaborator", label: "Kolaborator" },
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
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-1 rounded-full bg-surface-card p-1 shadow-ghost-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/settings?tab=${tab.id}`}
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm transition-colors ${
              active === tab.id
                ? "bg-navy text-ink-inverse"
                : "text-ink-muted hover:text-navy"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

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
    <form action={formAction} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm space-y-4">
      <h2 className="font-display text-xl text-ink">Profil Akun</h2>
      <label className="block">
        <span className="text-sm font-medium text-ink">Email</span>
        <input
          value={profile.email}
          disabled
          className={`${inputClass} opacity-70`}
        />
        <span className="mt-1 block text-xs text-ink-hint">
          Email tidak dapat diubah saat ini.
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">Nama lengkap</span>
        <input
          name="fullName"
          required
          defaultValue={profile.fullName}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">No. WhatsApp</span>
        <input
          name="phone"
          defaultValue={profile.phone}
          placeholder="+62 812 3456 7890"
          className={inputClass}
        />
      </label>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-dark">
          Profil diperbarui.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan"}
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
      <form action={formAction} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm space-y-4">
        <h2 className="font-display text-xl text-ink">Detail Acara</h2>
        <label className="block">
          <span className="text-sm font-medium text-ink">Judul acara</span>
          <input
            name="title"
            required
            defaultValue={event.title}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">URL Undangan</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-[color:var(--border-medium)] bg-white px-3 py-2 text-sm focus-within:border-navy focus-within:shadow-[var(--focus-ring-navy)]">
            <span className="text-ink-hint">uwu.id/</span>
            <input
              name="slug"
              required
              defaultValue={event.slug}
              pattern="[a-z0-9\-]+"
              className="flex-1 bg-transparent outline-none"
            />
          </div>
          <span className="mt-1 block text-xs text-ink-hint">
            Hanya huruf kecil, angka, dan tanda minus.
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">URL musik latar</span>
          <input
            name="musicUrl"
            type="url"
            defaultValue={event.musicUrl}
            placeholder="https://..."
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-ink-hint">
            Musik akan muted secara default. Tamu dapat mengaktifkan manual.
          </span>
        </label>
        <input
          type="hidden"
          name="culturalPreference"
          value={event.culturalPreference}
        />

        {state && !state.ok && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
            {state.error}
          </p>
        )}
        {state && state.ok && (
          <p className="rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-dark">
            Perubahan tersimpan.
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
          >
            {pending ? "Menyimpan..." : "Simpan Detail"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Publikasi</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {isPublished
            ? "Undangan aktif dan dapat diakses publik melalui URL."
            : "Undangan masih tersembunyi. Publikasikan untuk membagikan ke tamu."}
        </p>
        <div className="mt-4 flex items-center gap-3">
          {isPublished ? (
            <button
              type="button"
              disabled={publishPending}
              onClick={() =>
                startPublishTransition(async () => {
                  await unpublishEventAction(eventId);
                })
              }
              className="rounded-full border border-[color:var(--border-medium)] px-6 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              {publishPending ? "Memproses..." : "Unpublish"}
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
              className="rounded-full bg-navy px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
            >
              {publishPending ? "Memproses..." : "Publikasikan Undangan"}
            </button>
          )}
          <Link
            href={`/${event.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-ink-muted hover:text-navy"
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
    <form action={formAction} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm space-y-4">
      <h2 className="font-display text-xl text-ink">Preferensi Budaya</h2>
      <p className="text-sm text-ink-muted">
        Pengaturan ini memengaruhi template broadcast WhatsApp, label jadwal, dan tone AI copywriter.
      </p>
      <input type="hidden" name="title" value={event.title} />
      <input type="hidden" name="slug" value={event.slug} />
      <input type="hidden" name="musicUrl" value={event.musicUrl} />

      <div className="space-y-3">
        {options.map((opt) => (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition-colors ${
              event.culturalPreference === opt.id
                ? "border-navy bg-navy-50"
                : "border-[color:var(--border-ghost)] hover:border-navy"
            }`}
          >
            <input
              type="radio"
              name="culturalPreference"
              value={opt.id}
              defaultChecked={event.culturalPreference === opt.id}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-medium text-ink">{opt.label}</p>
              <p className="text-xs text-ink-muted">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-dark">
          Preferensi tersimpan.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan Preferensi"}
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
    <div className="space-y-4">
      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Kolaborator</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Undang pasangan agar bisa mengelola undangan bersama. Mereka dapat
          mengedit konten tetapi tidak bisa mengelola pembayaran atau menghapus
          acara.
        </p>

        <div className="mt-6 space-y-3">
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
            <div className="rounded-xl border border-dashed border-[color:var(--border-ghost)] bg-surface-muted/40 p-5 text-center text-sm text-ink-muted">
              Belum ada kolaborator. Undang pasangan Anda agar bisa mengelola
              undangan bersama.
            </div>
          )}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-medium text-white shadow-[0_6px_20px_-6px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02]"
          >
            + Undang Pasangan
          </button>
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
            className="rounded-full border border-rose/30 px-3 py-1 text-xs font-medium text-rose-dark transition-colors hover:border-rose hover:bg-rose-50"
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
                className="rounded-full border border-navy/25 px-3 py-1 text-xs font-medium text-navy transition-colors hover:bg-navy/5"
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
            className="rounded-full border border-navy/25 px-3 py-1 text-xs font-medium text-navy transition-colors hover:bg-navy/5 disabled:opacity-60"
          >
            {pending ? "Memproses..." : "🔄 Buat Link Baru"}
          </button>
          <button
            type="button"
            onClick={onRevoke}
            className="rounded-full border border-rose/30 px-3 py-1 text-xs font-medium text-rose-dark transition-colors hover:border-rose hover:bg-rose-50"
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
    accent === "owner" ? "bg-navy text-white" : "bg-gold-50 text-gold-dark";
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-ghost)] bg-white p-4 md:flex-row md:items-center md:gap-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${avatarBg}`}
        aria-hidden
      >
        {avatarInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-ink">{name}</p>
          {rightBadge && (
            <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-navy">
              {rightBadge}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ink-muted">{subtitle}</p>
        {status}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted md:inline-flex">
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
        className="relative w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-ghost-lg"
      >
        <h2 className="font-display text-xl text-ink">Undang Pasangan</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Kirim link undangan agar pasangan Anda bisa mengelola acara bersama.
        </p>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">
              Email pasangan <span className="text-rose">*</span>
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
            <span className="text-sm font-medium text-ink">Nama (opsional)</span>
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
            className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-60"
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
