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
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-2.5 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-[color:var(--overlay-modal)]"
        onClick={pending ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-surface-card p-6 shadow-ghost-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Grup Tamu</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Kelompokkan tamu untuk broadcast yang lebih terarah.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-hint hover:text-ink"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <form action={action} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-ink">Nama grup</span>
            <input
              name="name"
              required
              placeholder="Keluarga Mempelai Wanita"
              className={inputClass}
            />
          </label>
          <div>
            <span className="text-sm font-medium text-ink">Warna label</span>
            <ColorPalette value={color} onChange={setColor} />
            <input type="hidden" name="color" value={color} />
          </div>

          {state && !state.ok && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
          >
            {pending ? "Menyimpan..." : "+ Tambah Grup"}
          </button>
        </form>

        <hr className="my-5 border-[color:var(--border-ghost)]" />

        <h3 className="text-sm font-medium text-ink">Grup saat ini</h3>
        {groups.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Belum ada grup.</p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
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
    <li className="relative flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2">
      <button
        type="button"
        onClick={() => setPaletteOpen((v) => !v)}
        className="h-4 w-4 flex-shrink-0 rounded-full border border-black/10 transition-transform hover:scale-110"
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
          className="flex-1 rounded border border-navy/40 bg-white px-2 py-0.5 text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={savingName || savingColor}
          className="flex-1 text-left text-sm text-ink hover:text-navy"
          title="Klik untuk ubah nama"
        >
          {savingName || savingColor ? "Menyimpan..." : group.name}
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={editing || savingName}
        className="text-xs text-ink-muted hover:text-navy"
        aria-label="Ubah nama"
        title="Ubah nama"
      >
        ✏️
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={savingName || savingColor}
        className="text-xs font-medium text-ink-muted hover:text-rose"
      >
        Hapus
      </button>

      {paletteOpen && (
        <div className="absolute left-3 top-full z-10 mt-1 rounded-lg border border-[color:var(--border-medium)] bg-white p-2 shadow-lg">
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
            value === c ? "scale-110 border-navy" : "border-transparent"
          }`}
          style={{ background: c }}
          aria-label={`Pilih warna ${c}`}
        />
      ))}
      {/* Custom color swatch — opens native picker via label trick */}
      <label
        className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-transform ${
          isCustom ? "scale-110 border-navy" : "border-transparent"
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
