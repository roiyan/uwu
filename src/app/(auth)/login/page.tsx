"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, signInWithGoogleAction } from "@/lib/actions/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const registerHref = `/register?next=${encodeURIComponent(next)}`;

  return (
    <>
      <h1>
        Selamat datang <em>kembali.</em>
      </h1>
      <p className="auth-sub">
        Cerita kalian sudah menunggu di sini.
      </p>

      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="auth-btn auth-btn-outline">
          <GoogleIcon />
          <span>Masuk dengan Google</span>
        </button>
      </form>

      <div className="auth-divider" aria-hidden="true">
        atau dengan email
      </div>

      <form action={formAction}>
        <input type="hidden" name="next" value={next} />

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="kalian@contoh.com"
            className="auth-input"
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-password">
            Kata sandi
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            placeholder="••••••••"
            className="auth-input"
          />
        </div>

        {state && !state.ok && <p className="auth-error">{state.error}</p>}

        <div className="auth-stack" style={{ marginTop: 28 }}>
          <button
            type="submit"
            disabled={pending}
            className="auth-btn auth-btn-primary"
          >
            <span>{pending ? "Sedang masuk..." : "Masuk"}</span>
          </button>
        </div>
      </form>

      <div className="auth-links">
        <Link href="/reset-password" className="auth-muted-link">
          Lupa kata sandi?
        </Link>
        <span>
          Belum punya akun? <Link href={registerHref}>Mulai cerita</Link>
        </span>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="auth-google-ico" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.617z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.4 5.4 0 0 1 3.682 9c0-.592.102-1.167.282-1.707V4.96H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.04l3.007-2.333z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.96L3.964 7.29C4.672 5.164 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
