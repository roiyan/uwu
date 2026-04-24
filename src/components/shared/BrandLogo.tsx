import Image from "next/image";
import Link from "next/link";

type Size = "sm" | "md" | "lg" | "xl";

// Logo aspect ratio ~3.14:1 (intrinsic 3170x1010). Heights chosen to roughly
// match the previous text-xl/2xl/3xl/4xl wordmark footprints.
const SIZE_DIMENSIONS: Record<Size, { width: number; height: number }> = {
  sm: { width: 72, height: 24 },
  md: { width: 100, height: 32 },
  lg: { width: 150, height: 48 },
  xl: { width: 200, height: 64 },
};

export function BrandLogo({
  href,
  size = "md",
  className = "",
}: {
  href?: string;
  size?: Size;
  className?: string;
}) {
  const { width, height } = SIZE_DIMENSIONS[size];
  const inner = (
    <Image
      src="/logo.png"
      alt="uwu"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority={size === "lg" || size === "xl"}
    />
  );
  return href ? (
    <Link href={href} aria-label="uwu">
      {inner}
    </Link>
  ) : (
    inner
  );
}
