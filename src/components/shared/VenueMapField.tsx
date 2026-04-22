"use client";

import { useToast } from "@/components/shared/Toast";

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

function buildSearchUrl(venueName: string, venueAddress: string) {
  const q = [venueName, venueAddress]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  if (!q) return null;
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
}: {
  value: string;
  onChange: (v: string) => void;
  venueName: string;
  venueAddress: string;
}) {
  const toast = useToast();
  const searchUrl = buildSearchUrl(venueName, venueAddress);
  const hasSearchables = searchUrl !== null;
  const valid = isValidGoogleMapsUrl(value);
  const embedSrc = buildEmbedSrc(venueName, venueAddress);

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
        <span className="text-sm font-medium text-ink">Link Google Maps</span>
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
            href={searchUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!hasSearchables}
            onClick={(e) => {
              if (!hasSearchables) e.preventDefault();
            }}
            className={`mt-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg border px-4 py-3 text-sm font-medium transition-colors md:mt-1 ${
              hasSearchables
                ? "border-[color:var(--border-medium)] text-navy hover:bg-surface-muted"
                : "border-[color:var(--border-ghost)] text-ink-hint cursor-not-allowed"
            }`}
            title={
              hasSearchables
                ? "Buka Google Maps dengan pencarian otomatis"
                : "Isi Nama tempat atau Alamat dulu"
            }
          >
            🔍 Cari di Maps ↗
          </a>
        </div>
      </label>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-ink-hint">
          Klik &ldquo;Cari di Maps&rdquo; → temukan lokasi → salin link dari address bar → tempel di sini.
        </span>
        {value.trim() !== "" && valid && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#3B7A57]">
            ✓ Link valid
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="ml-1 text-navy hover:underline"
            >
              Buka ↗
            </a>
          </span>
        )}
        {value.trim() !== "" && !valid && (
          <span className="text-xs text-rose-dark">
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
          className="mt-3 h-48 w-full rounded-xl border border-[color:var(--border-ghost)]"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </div>
  );
}
