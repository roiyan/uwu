import type { ReactNode } from "react";

// Homepage renders its own nav + footer inside the page itself, so the
// layout is a passthrough. Deliberately separate from (public)/layout
// so /harga, /tema, /portofolio, /tema/[slug] keep their shared chrome.
export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
