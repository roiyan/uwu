"use client";

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
  const searchUrl = buildSearchUrl(venueName, venueAddress);
  const hasSearchables = searchUrl !== null;
  const valid = isValidGoogleMapsUrl(value);

  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-medium text-ink">Link Google Maps</span>
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://maps.google.com/..."
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
          🔍 Cari di Google Maps
        </a>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-ink-hint">
          Buka Google Maps, cari lokasi, lalu salin link dari address bar ke sini.
        </span>
        {value.trim() !== "" && valid && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-navy hover:underline"
          >
            Buka Maps ↗
          </a>
        )}
        {value.trim() !== "" && !valid && (
          <span className="text-xs text-rose-dark">
            Link tidak dikenali sebagai Google Maps.
          </span>
        )}
      </div>
    </label>
  );
}
