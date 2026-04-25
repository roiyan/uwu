// 7-point mini line chart used on Analytics KPI cards. Pure SVG, no
// JS — renders a smooth path through the points + a faint baseline.
// Falls back to a flat line at zero when the series is empty.
export function Sparkline({
  values,
  color,
  height = 32,
  className,
}: {
  values: number[];
  color: string;
  height?: number;
  className?: string;
}) {
  const width = 120;
  const padX = 2;
  const padY = 4;
  const innerW = width - 2 * padX;
  const innerH = height - 2 * padY;

  const safe = values.length > 0 ? values : [0, 0];
  const max = Math.max(1, ...safe);
  const xStep = innerW / Math.max(1, safe.length - 1);

  const points = safe.map((v, i) => ({
    x: padX + i * xStep,
    y: padY + innerH - (v / max) * innerH,
  }));

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const baseline = padY + innerH;
  const area = `${path} L ${padX + innerW} ${baseline} L ${padX} ${baseline} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`spark-${color.replace(/[^a-z0-9]/gi, "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={area}
        fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, "")})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && (
        <circle
          cx={last.x}
          cy={last.y}
          r="2"
          fill={color}
        />
      )}
    </svg>
  );
}
