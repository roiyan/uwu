import Link from "next/link";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  note,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  note?: string;
}) {
  return (
    <section className="rounded-2xl bg-surface-card p-10 text-center shadow-ghost-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-50 text-3xl text-gold-dark">
        {icon}
      </div>
      <h2 className="mt-4 font-display text-2xl text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 inline-block rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark"
        >
          {actionLabel}
        </Link>
      )}
      {note && <p className="mt-4 text-xs text-ink-hint">{note}</p>}
    </section>
  );
}
