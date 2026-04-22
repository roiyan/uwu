"use client";

import { useFormStatus } from "react-dom";

export function SaveButton({
  idleLabel,
  pendingLabel = "Menyimpan...",
  variant = "coral",
}: {
  idleLabel: string;
  pendingLabel?: string;
  variant?: "coral" | "navy";
}) {
  const { pending } = useFormStatus();
  const base =
    "inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-medium text-white transition-colors disabled:opacity-60";
  const bg =
    variant === "navy"
      ? "bg-navy hover:bg-navy-dark"
      : "bg-coral hover:bg-coral-dark";

  return (
    <button type="submit" disabled={pending} className={`${base} ${bg}`}>
      {pending && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          aria-hidden
        />
      )}
      <span>{pending ? pendingLabel : idleLabel}</span>
    </button>
  );
}
