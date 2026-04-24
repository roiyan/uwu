"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/auth";

export default function ResetRequestPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    null,
  );

  if (state?.ok) {
    return (
      <>
        <h1>
          Email <em>terkirim.</em>
        </h1>
        <p className="auth-sub">
          Kami telah mengirim tautan untuk mengatur ulang kata sandi ke email
          Anda. Periksa inbox (dan folder spam).
        </p>
        <div className="auth-links">
          <Link href="/login">Kembali ke halaman masuk</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>
        Lupa <em>kata sandi?</em>
      </h1>
      <p className="auth-sub">
        Masukkan email Anda. Kami akan kirim tautan untuk mengatur ulang.
      </p>

      <form action={formAction}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="reset-email">
            Email
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="kalian@contoh.com"
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
            <span>{pending ? "Mengirim..." : "Kirim tautan reset"}</span>
          </button>
        </div>
      </form>

      <div className="auth-links">
        <Link href="/login" className="auth-muted-link">
          Kembali ke halaman masuk
        </Link>
      </div>
    </>
  );
}
