type Palette = { primary: string; secondary: string; accent: string };

export function ThemePreviewCard({
  palette,
  bride,
  groom,
  date,
}: {
  palette: Palette;
  bride: string;
  groom: string;
  date: string;
}) {
  return (
    <div
      className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-3xl p-10 text-center shadow-ghost-md"
      style={{ background: palette.secondary }}
    >
      <p
        className="text-xs uppercase tracking-[0.3em]"
        style={{ color: palette.primary }}
      >
        The Wedding Of
      </p>
      <h3
        className="mt-4 font-display text-4xl italic"
        style={{ color: palette.primary }}
      >
        {bride} &amp; {groom}
      </h3>
      <p className="mt-4 text-sm" style={{ color: "#1A1A2E" }}>
        {date}
      </p>
      <div className="mt-8 flex items-center gap-3" style={{ color: palette.accent }}>
        <span className="h-px w-14 bg-current" />
        <span>♡</span>
        <span className="h-px w-14 bg-current" />
      </div>
      <div
        className="mt-8 flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-ghost-md"
        style={{ background: palette.primary }}
      >
        ♡
      </div>
    </div>
  );
}
