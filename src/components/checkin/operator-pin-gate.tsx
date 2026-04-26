"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  verifyOperatorPinAction,
  verifyOperatorSessionAction,
} from "@/lib/actions/checkin";

type GateState = "checking" | "needs-pin" | "authenticated";

const PIN_LENGTH = 4;
const STORAGE_PREFIX = "uwu-operator-";

function storageKey(eventId: string) {
  return `${STORAGE_PREFIX}${eventId}`;
}

export function OperatorPinGate({
  eventId,
  token,
  eventTitle,
  children,
}: {
  eventId: string;
  token: string | null;
  eventTitle: string;
  children: (handleSignOut: () => void) => React.ReactNode;
}) {
  const [state, setState] = useState<GateState>("checking");
  const [digits, setDigits] = useState<string[]>(() =>
    Array(PIN_LENGTH).fill(""),
  );
  const [error, setError] = useState<string | null>(null);
  const [verifying, startVerify] = useTransition();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!token) {
      setState("needs-pin");
      return;
    }
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey(eventId));
    if (!saved) {
      setState("needs-pin");
      return;
    }
    let cancelled = false;
    verifyOperatorSessionAction(eventId, saved).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setState("authenticated");
      } else {
        window.localStorage.removeItem(storageKey(eventId));
        setState("needs-pin");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, token]);

  useEffect(() => {
    if (state === "needs-pin") {
      // Focus first PIN slot once the gate renders.
      const t = setTimeout(() => refs.current[0]?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [state]);

  function handleSignOut() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey(eventId));
    }
    setDigits(Array(PIN_LENGTH).fill(""));
    setError(null);
    setState("needs-pin");
  }

  function submit(value: string) {
    if (!token) return;
    if (value.length !== PIN_LENGTH) return;
    setError(null);
    startVerify(async () => {
      const res = await verifyOperatorPinAction(eventId, token, value);
      if (res.ok && res.data) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            storageKey(eventId),
            res.data.sessionKey,
          );
        }
        setState("authenticated");
      } else if (!res.ok) {
        setError(res.error);
        setDigits(Array(PIN_LENGTH).fill(""));
        // Re-trigger the shake animation by toggling key on the row.
        refs.current[0]?.focus();
      }
    });
  }

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    setError(null);

    if (value && index < PIN_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
    if (next.every((d) => d) && index === PIN_LENGTH - 1) {
      submit(next.join(""));
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "Enter") {
      const value = digits.join("");
      if (value.length === PIN_LENGTH) submit(value);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (text.length === 0) return;
    e.preventDefault();
    const next = Array(PIN_LENGTH).fill("");
    for (let i = 0; i < Math.min(PIN_LENGTH, text.length); i++) {
      next[i] = text[i];
    }
    setDigits(next);
    if (text.length >= PIN_LENGTH) {
      submit(next.join(""));
    } else {
      refs.current[Math.min(text.length, PIN_LENGTH - 1)]?.focus();
    }
  }

  if (state === "checking") {
    return (
      <main
        className="theme-dashboard flex min-h-screen items-center justify-center px-5"
        style={{ background: "var(--d-bg-0)", color: "var(--d-ink)" }}
      >
        <p className="d-serif text-[14px] italic text-[var(--d-ink-dim)]">
          Memuat sesi…
        </p>
      </main>
    );
  }

  if (state === "needs-pin") {
    return (
      <main
        className="theme-dashboard flex min-h-screen items-center justify-center px-6"
        style={{ background: "var(--d-bg-0)", color: "var(--d-ink)" }}
      >
        <div className="w-full max-w-sm text-center">
          <div className="d-mono mb-6 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
            <span aria-hidden className="h-px w-8 bg-[var(--d-coral)]" />
            UWU · Stasiun Operator
          </div>

          <span
            aria-hidden
            className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border"
            style={{
              background: "rgba(240,160,156,0.08)",
              borderColor: "rgba(240,160,156,0.2)",
              color: "var(--d-coral)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-7 w-7"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </span>

          <h1 className="d-serif text-[28px] font-extralight leading-[1.1] text-[var(--d-ink)]">
            Masukkan{" "}
            <em className="d-serif italic text-[var(--d-coral)]">PIN</em>
          </h1>
          <p className="d-serif mt-2 text-[13px] italic text-[var(--d-ink-dim)]">
            {eventTitle ? (
              <>
                Untuk acara{" "}
                <span className="not-italic text-[var(--d-ink)]">
                  {eventTitle}
                </span>
                . PIN diberikan oleh pasangan pengantin.
              </>
            ) : (
              "PIN diberikan oleh pasangan pengantin."
            )}
          </p>

          <div
            key={error ? `err-${digits.join("")}` : "ok"}
            className={`mt-8 flex justify-center gap-3 ${error ? "animate-shake" : ""}`}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="tel"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digits[i]}
                disabled={!token || verifying}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                aria-label={`Digit ${i + 1}`}
                className={`d-mono h-16 w-14 rounded-xl border bg-[rgba(255,255,255,0.03)] text-center text-[24px] text-[var(--d-ink)] outline-none transition-colors focus:bg-[rgba(240,160,156,0.04)] focus:border-[var(--d-coral)] disabled:opacity-50 ${
                  error
                    ? "border-[var(--d-red)]"
                    : "border-[var(--d-line-strong)]"
                }`}
              />
            ))}
          </div>

          {!token && (
            <p className="d-serif mt-5 text-[13px] italic text-[var(--d-coral)]">
              Link tidak valid. Hubungi pasangan untuk dapatkan link operator
              yang baru.
            </p>
          )}

          {error && token && (
            <p className="d-serif mt-5 text-[13px] italic text-[var(--d-coral)]">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => submit(digits.join(""))}
            disabled={
              !token ||
              digits.join("").length < PIN_LENGTH ||
              verifying
            }
            className="d-mono mt-7 w-full rounded-full bg-[var(--d-coral)] py-3 text-[12px] font-medium uppercase tracking-[0.22em] text-[#0B0B15] transition-shadow hover:shadow-[0_10px_30px_rgba(240,160,156,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {verifying ? "Memverifikasi…" : "Masuk →"}
          </button>
        </div>
      </main>
    );
  }

  return <>{children(handleSignOut)}</>;
}
