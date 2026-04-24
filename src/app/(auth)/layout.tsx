import type { ReactNode } from "react";
import Link from "next/link";
import "./auth.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-auth">
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-glow g-blue" />
        <div className="auth-glow g-coral" />
        <div className="auth-glow g-lilac" />
      </div>

      <Link href="/" className="auth-logo" aria-label="uwu">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/UWU_with_text.svg" alt="uwu" draggable={false} />
      </Link>

      <div className="auth-card">{children}</div>

      <p className="auth-foot">© 2026 uwu Wedding Platform</p>
    </div>
  );
}
