import Link from "next/link";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<Size, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

// Wordmark "uwu" with the brand 3-stop gradient. Central source of truth —
// tweak here to update every navbar/header/sidebar at once.
export function BrandLogo({
  href,
  size = "md",
  className = "",
}: {
  href?: string;
  size?: Size;
  className?: string;
}) {
  const inner = (
    <span
      className={`font-logo ${SIZE_CLASS[size]} text-gradient ${className}`}
      aria-label="uwu"
    >
      uwu
    </span>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
