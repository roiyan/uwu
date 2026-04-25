"use client";

import type { ReactNode } from "react";

export type Viewport = "mobile" | "tablet" | "desktop";

const VIEWPORT: Record<Viewport, { width: number; label: string }> = {
  mobile: { width: 390, label: "Mobile · 390px" },
  tablet: { width: 768, label: "Tablet · 768px" },
  desktop: { width: 1280, label: "Desktop · 1280px" },
};

// Scales the preview viewport down so `width` fits inside the column, but
// keeps the inner document rendered at its natural size (so media queries
// behave like a real device).
function scaleFor(viewport: Viewport, containerWidth: number): number {
  const { width } = VIEWPORT[viewport];
  // Leave a small padding ring visually.
  const target = Math.min(containerWidth - 32, width);
  return Math.min(1, target / width);
}

export function PhoneFrame({
  viewport,
  containerWidth = 560,
  children,
}: {
  viewport: Viewport;
  containerWidth?: number;
  children: ReactNode;
}) {
  const { width } = VIEWPORT[viewport];
  const scale = scaleFor(viewport, containerWidth);
  const displayWidth = width * scale;
  // Render at a fixed tall "phone" height so users can scroll inside.
  const renderHeight = viewport === "desktop" ? 780 : 720;
  const displayHeight = renderHeight * scale;

  const radius = viewport === "mobile" ? 36 : viewport === "tablet" ? 22 : 14;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative rounded-[inherit] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/5"
        style={{
          width: displayWidth,
          height: displayHeight,
          borderRadius: radius * scale + 8,
          padding: 8 * scale + 2,
          background: "#1A1B26",
        }}
      >
        <div
          className="relative overflow-hidden bg-white"
          style={{
            width: width * scale,
            height: renderHeight * scale,
            borderRadius: radius * scale,
          }}
        >
          {/* Render the child at natural size, then scale the whole box. */}
          <div
            className="origin-top-left"
            style={{
              width,
              height: renderHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="h-full w-full overflow-auto">{children}</div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--d-ink-faint)]">
        {VIEWPORT[viewport].label}
      </p>
    </div>
  );
}

export function ViewportToggle({
  value,
  onChange,
}: {
  value: Viewport;
  onChange: (v: Viewport) => void;
}) {
  const items: { id: Viewport; label: string; icon: string }[] = [
    { id: "mobile", label: "Mobile", icon: "📱" },
    { id: "tablet", label: "Tablet", icon: "▢" },
    { id: "desktop", label: "Desktop", icon: "🖥" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Ukuran preview"
      className="inline-flex items-center gap-1 rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] p-1"
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`d-mono rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] transition-colors ${
              active
                ? "bg-[var(--d-bg-1)] text-[var(--d-ink)]"
                : "text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
            }`}
          >
            <span className="mr-1">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
