"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  createGuestGroupAction,
  deleteGuestGroupAction,
  updateGuestGroupAction,
} from "@/lib/actions/guest";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import type { GuestGroupRow } from "./client";

const inputClass =
  "mt-2 w-full bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[14px] text-[var(--d-ink)] outline-none placeholder:text-[var(--d-ink-faint)] focus:border-[var(--d-coral)] transition-colors";

const labelClass =
  "d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]";

const COLOR_PRESETS = [
  "#F0CDD4",
  "#C5D4E8",
  "#E0BB92",
  "#F2EDE7",
  "#D4A574",
  "#8B9DC3",
];
const DEFAULT_COLOR = COLOR_PRESETS[0];

export function GroupsPanel({
  open,
  eventId,
  groups,
  onClose,
}: {
  open: boolean;
  eventId: string;
  groups: GuestGroupRow[];
  onClose: () => void;
}) {
  const toast = useToast();
  const create = createGuestGroupAction.bind(null, eventId);
  const [state, action, pending] = useActionState(create, null);
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [deleteTarget, setDeleteTarget] = useState<GuestGroupRow | null>(null);
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="theme-dashboard fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={pending ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
              Grup
            </p>
            <h2 className="d-serif mt-2 text-[26px] font-extralight text-[var(--d-ink)]">
              Kelola Grup Tamu
            </h2>
            <p className="mt-2 text-[13px] text-[var(--d-ink-dim)]">
              Kelompokkan tamu untuk broadcast yang lebih terarah.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--d-line-strong)] text-[var(--d-ink-dim)] hover:bg-[var(--d-bg-2)] hover:text-[var(--d-ink)]"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <form action={action} className="mt-6 space-y-4">
          <label className="block">
            <span className={labelClass}>Nama grup</span>
            <input
              name="name"
              required
              placeholder="Keluarga Mempelai Wanita"
              className={inputClass}
            />
          </label>
          <div>
            <span className={labelClass}>Warna label</span>
            <ColorPalette value={color} onChange={setColor} />
            <input type="hidden" name="color" value={color} />
          </div>

          {state && !state.ok && (
            <p className="rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="d-mono w-full rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Menyimpan…" : "+ Tambah Grup"}
          </button>
        </form>

        <hr className="my-6 border-[var(--d-line)]" />

        <h3 className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
          Grup Saat Ini
        </h3>
        {groups.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--d-ink-dim)]">
            Belum ada grup.
          </p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {groups.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                eventId={eventId}
                onDelete={() => setDeleteTarget(g)}
                onError={(msg) => toast.error(msg)}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus grup?"
        description={
          deleteTarget
            ? `Grup ${deleteTarget.name} akan dihapus. Tamu di grup ini tidak ikut terhapus.`
            : undefined
        }
        loading={deletePending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          startDelete(async () => {
            await deleteGuestGroupAction(eventId, target.id);
            setDeleteTarget(null);
          });
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ========= Per-row: inline rename + color popover ========= */

function GroupRow({
  group,
  eventId,
  onDelete,
  onError,
}: {
  group: GuestGroupRow;
  eventId: string;
  onDelete: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [savingName, startSaveName] = useTransition();
  const [savingColor, startSaveColor] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    setDraft(group.name);
  }, [group.name]);

  function saveName() {
    const next = draft.trim();
    if (next === group.name) {
      setEditing(false);
      return;
    }
    startSaveName(async () => {
      const res = await updateGuestGroupAction(eventId, group.id, {
        name: next,
      });
      if (!res.ok) {
        onError(res.error);
        setDraft(group.name); // revert draft
      }
      setEditing(false);
    });
  }

  function saveColor(color: string) {
    setPaletteOpen(false);
    if (color === (group.color ?? DEFAULT_COLOR)) return;
    startSaveColor(async () => {
      const res = await updateGuestGroupAction(eventId, group.id, { color });
      if (!res.ok) onError(res.error);
    });
  }

  return (
    <li className="relative flex items-center gap-3 rounded-md border border-[var(--d-line)] bg-[var(--d-bg-2)] px-3 py-2">
      <button
        type="button"
        onClick={() => setPaletteOpen((v) => !v)}
        className="h-4 w-4 flex-shrink-0 rounded-full border border-[var(--d-line-strong)] transition-transform hover:scale-110"
        style={{ background: group.color ?? DEFAULT_COLOR }}
        aria-label="Ubah warna"
        title="Ubah warna"
      />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveName();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraft(group.name);
              setEditing(false);
            }
          }}
          disabled={savingName}
          className="flex-1 rounded border border-[var(--d-coral)] bg-transparent px-2 py-0.5 text-[13px] text-[var(--d-ink)] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={savingName || savingColor}
          className="flex-1 text-left text-[13px] text-[var(--d-ink)] transition-colors hover:text-[var(--d-coral)]"
          title="Klik untuk ubah nama"
        >
          {savingName || savingColor ? "Menyimpan…" : group.name}
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={editing || savingName}
        className="text-xs text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)]"
        aria-label="Ubah nama"
        title="Ubah nama"
      >
        ✏️
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={savingName || savingColor}
        className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-coral)]"
      >
        Hapus
      </button>

      {paletteOpen && (
        <div className="absolute left-3 top-full z-10 mt-1 rounded-md border border-[var(--d-line-strong)] bg-[var(--d-bg-1)] p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
          <ColorPalette
            value={group.color ?? DEFAULT_COLOR}
            onChange={saveColor}
          />
        </div>
      )}
    </li>
  );
}

/* ========= Shared palette: 6 presets + 1 custom native picker ========= */

function ColorPalette({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const isCustom = !COLOR_PRESETS.includes(value);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {COLOR_PRESETS.map((c) => (
        <button
          type="button"
          key={c}
          onClick={() => onChange(c)}
          className={`h-8 w-8 rounded-full border transition-transform ${
            value === c ? "scale-110 border-[var(--d-coral)]" : "border-transparent"
          }`}
          style={{ background: c }}
          aria-label={`Pilih warna ${c}`}
        />
      ))}
      {/* Custom color swatch — opens native picker via label trick */}
      <label
        className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-transform ${
          isCustom ? "scale-110 border-[var(--d-coral)]" : "border-transparent"
        }`}
        style={{
          background: isCustom
            ? value
            : "conic-gradient(from 0deg, #f87171, #facc15, #34d399, #60a5fa, #a78bfa, #f472b6, #f87171)",
        }}
        title="Warna custom"
        aria-label="Pilih warna custom"
      >
        {!isCustom && (
          <span className="text-xs text-white drop-shadow" aria-hidden="true">
            🎨
          </span>
        )}
        <input
          type="color"
          value={isCustom ? value : "#f0a09c"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
