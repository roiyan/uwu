"use client";

import { useToast } from "@/components/shared/Toast";

const inputLight =
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

// Dark variant used by the onboarding redesign — underline-only,
// matches .ob-input. Triggered via the `tone="dark"` prop so the
// dashboard pages keep their existing light look.
const inputDark =
  "mt-1 w-full bg-transparent border-0 border-b border-[var(--ob-line-strong)] px-0 py-3 text-[var(--ob-ink)] font-serif text-base font-light outline-none placeholder:italic placeholder:text-[var(--ob-ink-faint)] focus:border-[var(--ob-coral)]";

function buildSearchUrl(venueName: string, venueAddress: string): string {
  const q = [venueName, venueAddress]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  // Always returns a usable URL — when the venue fields are empty
  // we send the user to plain Google Maps so they can search there
  // and copy a link back. Avoids the previous "disabled button with
  // no explanation" UX trap.
  if (!q) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function isValidGoogleMapsUrl(url: string) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      u.hostname === "maps.google.com" ||
      u.hostname === "www.google.com" ||
      u.hostname === "goo.gl" ||
      u.hostname === "maps.app.goo.gl" ||
      u.hostname.endsWith(".google.com")
    );
  } catch {
    return false;
  }
}

// Build a lightweight embed iframe source. Short-link URLs (goo.gl /
// maps.app.goo.gl) can't be resolved client-side, and /maps/place?q= URLs
// contain the query we want. The iframe below is driven by the venue name +
// address (free `maps?output=embed`), not by parsing the pasted URL — this
// always works without an API key and keeps the iframe in sync as the user
// types.
function buildEmbedSrc(venueName: string, venueAddress: string) {
  const q = [venueName, venueAddress]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  if (!q) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
}

export function VenueMapField({
  value,
  onChange,
  venueName,
  venueAddress,
  tone = "light",
}: {
  value: string;
  onChange: (v: string) => void;
  venueName: string;
  venueAddress: string;
  tone?: "light" | "dark";
}) {
  const toast = useToast();
  const searchUrl = buildSearchUrl(venueName, venueAddress);
  // The button is now always enabled — when venueName/Address are
  // empty, searchUrl is plain Google Maps; the user can search there
  // and copy a link back. Tracked separately so the tooltip text can
  // explain what each click will do.
  const hasSearchables = Boolean(
    [venueName, venueAddress].map((s) => s.trim()).filter(Boolean).length,
  );
  const valid = isValidGoogleMapsUrl(value);
  const embedSrc = buildEmbedSrc(venueName, venueAddress);
  const isDark = tone === "dark";
  const inputClass = isDark ? inputDark : inputLight;
  const labelClass = isDark
    ? "ob-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)]"
    : "text-sm font-medium text-ink";
  const helpClass = isDark
    ? "text-[11px] text-[var(--ob-ink-dim)]"
    : "text-xs text-ink-hint";
  const ctaClass = isDark
    ? "border-[var(--ob-line-strong)] text-[var(--ob-ink)] hover:bg-[var(--ob-bg-2)]"
    : "border-[color:var(--border-medium)] text-navy hover:bg-surface-muted";
  const iframeBorder = isDark
    ? "border border-[var(--ob-line-strong)]"
    : "border border-[color:var(--border-ghost)]";

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted) return;
    if (isValidGoogleMapsUrl(pasted)) {
      e.preventDefault();
      onChange(pasted);
      toast.success("Link Google Maps berhasil ditempel");
    }
    // Non-Google URLs fall through to default paste behaviour; the "tidak
    // dikenali" hint below will nudge them to use the correct link.
  }

  return (
    <div className="md:col-span-2">
      <label className="block">
        <span className={`block ${labelClass}`}>Link Google Maps</span>
        <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="Tempel link Google Maps di sini..."
            className={inputClass}
          />
          <a
            href={searchUrl}
            target="_blank"
            rel="noreferrer"
            className={`mt-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg border px-4 py-3 text-sm font-medium transition-colors md:mt-1 ${ctaClass}`}
            title={
              hasSearchables
                ? "Buka Google Maps dengan pencarian otomatis"
                : "Buka Google Maps untuk mencari lokasi"
            }
          >
            🔍 Cari di Maps ↗
          </a>
        </div>
      </label>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className={`${helpClass} ${isDark ? "italic" : ""}`}>
          {hasSearchables
            ? "Klik “Cari di Maps” → temukan lokasi → klik “Share” → salin link → tempel di sini."
            : "Buka Maps → cari lokasi → klik “Share” → salin link → tempel di sini."}
        </span>
        {value.trim() !== "" && valid && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              isDark ? "text-[#A8D5B8]" : "text-[#3B7A57]"
            }`}
          >
            ✓ Link valid
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className={`ml-1 hover:underline ${
                isDark ? "text-[var(--ob-blue)]" : "text-navy"
              }`}
            >
              Buka ↗
            </a>
          </span>
        )}
        {value.trim() !== "" && !valid && (
          <span
            className={`text-xs ${
              isDark ? "text-[var(--ob-coral)]" : "text-rose-dark"
            }`}
          >
            Link tidak dikenali sebagai Google Maps.
          </span>
        )}
      </div>

      {embedSrc && (
        <iframe
          key={embedSrc}
          title={`Pratinjau peta ${venueName || venueAddress}`}
          src={embedSrc}
          loading="lazy"
          className={`mt-3 h-48 w-full rounded-xl ${iframeBorder}`}
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </div>
  );
}
