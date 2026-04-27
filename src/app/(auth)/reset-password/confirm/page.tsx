"use client";

import { useActionState } from "react";
import { confirmPasswordResetAction } from "@/lib/actions/auth";

export default function ResetConfirmPage() {
  const [state, formAction, pending] = useActionState(
    confirmPasswordResetAction,
    null,
  );

  return (
    <>
      <h1>
        Atur <em>kata sandi</em> baru.
      </h1>
      <p className="auth-sub">Masukkan kata sandi baru untuk akun kalian.</p>

      <form action={formAction}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="new-password">
            Kata sandi baru
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            className="auth-input"
          />
          <span className="auth-input-hint">
            Gunakan kombinasi huruf dan angka.
          </span>
        </div>

        {state && !state.ok && <p className="auth-error">{state.error}</p>}

        <div className="auth-stack" style={{ marginTop: 28 }}>
          <button
            type="submit"
            disabled={pending}
            className="auth-btn auth-btn-primary"
          >
            <span>{pending ? "Menyimpan..." : "Simpan & Lanjutkan"}</span>
          </button>
        </div>
      </form>
    </>
  );
}
