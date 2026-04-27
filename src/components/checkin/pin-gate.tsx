"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  verifyOperatorPinAction,
  verifyOperatorSessionAction,
} from "@/lib/actions/checkin";
import {
  operatorSessionPayload,
  operatorSessionStorageKey,
  operatorSessionValue,
  readOperatorSessionPayload,
} from "@/lib/utils/operator";

/**
 * 4-digit PIN gate that sits in front of the public check-in station.
 * Phases:
 *   1. checking — saved session is being re-validated against the
 *      server (covers reload / day-of-event return).
 *   2. needs-pin — keypad screen.
 *   3. needs-name — operator labels their shift once. Reload skips
 *      this when the JSON session payload is present.
 *   4. ready — render-prop children fire with the operator's name +
 *      sign-out hook.
 *
 * Token validity check ALWAYS happens server-side. The gate trusts
 * nothing from localStorage on its own — `verifyOperatorSessionAction`
 * re-checks the (token, pin) pair against the live event row, which
 * means a "Reset Link & PIN" from the dashboard kicks the operator
 * out automatically.
 */
export function PinGate({
  eventId,
  token,
  eventTitle,
  children,
}: {
  eventId: string;
  /** May be missing/invalid — we still render the keypad so the
   *  operator gets a useful error rather than a silent NotFound. */
  token: string | null;
  eventTitle: string;
  /** Render-prop so the unlocked station receives the operator name
   *  collected on the second screen + a sign-out hook. */
  children: (
    operatorName: string,
    onSignOut: () => void,
  ) => React.ReactNode;
}) {
  const [phase, setPhase] = useState<
    "checking" | "needs-pin" | "needs-name" | "ready"
  >("checking");
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [operatorName, setOperatorName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!token) {
      setPhase("needs-pin");
      return;
    }
    const storedKey = operatorSessionStorageKey(eventId);
    const rawSaved =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(storedKey);
    const saved = readOperatorSessionPayload(rawSaved);
    if (!saved) {
      setPhase("needs-pin");
      return;
    }
    let cancelled = false;
    verifyOperatorSessionAction(eventId, saved.sessionKey).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        if (saved.operatorName) {
          setOperatorName(saved.operatorName);
          setPhase("ready");
        } else {
          // Legacy session (pre-name capture) — keep the verified
          // session key but route through the name screen.
          setPhase("needs-name");
        }
      } else {
        window.localStorage.removeItem(storedKey);
        setPhase("needs-pin");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, token]);

  useEffect(() => {
    if (phase === "needs-pin") {
      inputRefs.current[0]?.focus();
    } else if (phase === "needs-name") {
      const t = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function setDigit(index: number, raw: string) {
    if (!/^\d?$/.test(raw)) return;
    const next = [...pinDigits];
    next[index] = raw.slice(-1);
    setPinDigits(next);
    setPinError(null);
    if (raw && index < 3) inputRefs.current[index + 1]?.focus();
    if (raw && index === 3 && next.every((d) => d)) {
      setTimeout(() => submitPin(next.join("")), 50);
    }
  }

  function handleKeyDown(
    index: number,
    e: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      submitPin(pinDigits.join(""));
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").trim();
    const digits = text.replace(/\D/g, "").slice(0, 4);
    if (digits.length === 4) {
      e.preventDefault();
      const next = digits.split("");
      setPinDigits(next);
      setPinError(null);
      setTimeout(() => submitPin(digits), 50);
    }
  }

  async function submitPin(pin: string) {
    if (pin.length !== 4 || verifying) return;
    if (!token) {
      setPinError("Link tidak dikenali. Minta link baru dari pasangan.");
      return;
    }
    setVerifying(true);
    setPinError(null);
    const res = await verifyOperatorPinAction(eventId, token, pin);
    if (res.ok && res.data) {
      // Don't persist yet — wait for operator name on the next screen
      // so the saved payload always has both halves.
      setPhase("needs-name");
      setVerifying(false);
      return;
    }
    setPinError(res.ok ? "Verifikasi belum berhasil. Coba lagi." : res.error);
    setPinDigits(["", "", "", ""]);
    inputRefs.current[0]?.focus();
    setVerifying(false);
  }

  function commitOperatorName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setPinError("Nama operator wajib diisi.");
      nameInputRef.current?.focus();
      return;
    }
    setPinError(null);
    setOperatorName(trimmed);
    if (token) {
      try {
        const pin = pinDigits.join("");
        let sessionKey: string;
        if (pin.length === 4) {
          sessionKey = operatorSessionValue(token, pin);
        } else {
          // Legacy upgrade path — operator just verified an old
          // token-only session. Reuse the still-saved sessionKey.
          const existing = readOperatorSessionPayload(
            window.localStorage.getItem(
              operatorSessionStorageKey(eventId),
            ),
          );
          sessionKey = existing?.sessionKey ?? "";
        }
        if (sessionKey) {
          const [tk, pn] = sessionKey.split(":");
          const payload = operatorSessionPayload(tk, pn ?? "0000", trimmed);
          window.localStorage.setItem(
            operatorSessionStorageKey(eventId),
            JSON.stringify(payload),
          );
        }
      } catch {
        // Storage write failed (private mode, quota); operator can
        // still proceed — they'll just be re-prompted on reload.
      }
    }
    setPhase("ready");
  }

  function handleSignOut() {
    try {
      window.localStorage.removeItem(operatorSessionStorageKey(eventId));
    } catch {
      /* ignore */
    }
    setPinDigits(["", "", "", ""]);
    setNameDraft("");
    setOperatorName("");
    setPhase("needs-pin");
  }

  if (phase === "ready")
    return <>{children(operatorName, handleSignOut)}</>;

  return (
    <main
      className="theme-dashboard flex min-h-screen items-center justify-center px-6 py-12"
      style={{ background: "var(--d-bg-0)", color: "var(--d-ink)" }}
    >
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-3">
          <span aria-hidden className="h-px w-7 bg-[var(--d-coral)]" />
          <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
            Stasiun Check-in
          </p>
        </div>
        <h1 className="d-serif mt-3 text-[24px] font-extralight leading-tight text-[var(--d-ink)]">
          {eventTitle}
        </h1>

        <span
          aria-hidden
          className="mt-7 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(240,160,156,0.2)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]"
        >
          {phase === "needs-name" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          )}
        </span>

        <h2 className="d-serif mt-5 text-[22px] font-light text-[var(--d-ink)]">
          {phase === "needs-name" ? (
            <>
              Siapa yang{" "}
              <em className="d-serif italic text-[var(--d-coral)]">
                bertugas
              </em>
              ?
            </>
          ) : (
            <>
              Masukkan{" "}
              <em className="d-serif italic text-[var(--d-coral)]">PIN</em>
            </>
          )}
        </h2>
        <p className="d-serif mt-1.5 text-[13px] italic text-[var(--d-ink-dim)]">
          {phase === "needs-name"
            ? "Nama ini akan tercatat di setiap tamu yang Anda check-in."
            : "PIN diberikan oleh pasangan pengantin."}
        </p>

        {phase === "checking" ? (
          <p className="d-mono mt-8 text-[10px] uppercase tracking-[0.24em] text-[var(--d-ink-faint)]">
            Memeriksa sesi…
          </p>
        ) : phase === "needs-name" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitOperatorName();
            }}
            className="mt-7 space-y-4"
          >
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => {
                setNameDraft(e.target.value);
                if (pinError) setPinError(null);
              }}
              maxLength={80}
              placeholder="Nama lengkap"
              autoComplete="name"
              autoCapitalize="words"
              className={`h-14 w-full rounded-xl border bg-[rgba(255,255,255,0.025)] px-4 text-center text-[16px] text-[var(--d-ink)] outline-none transition-colors ${
                pinError
                  ? "border-[#E08A8A]"
                  : "border-[var(--d-line-strong)] focus:border-[var(--d-coral)] focus:bg-[rgba(240,160,156,0.04)]"
              }`}
            />
            {pinError && (
              <p className="d-serif text-[13px] italic text-[#E08A8A]">
                {pinError}
              </p>
            )}
            <button
              type="submit"
              disabled={!nameDraft.trim()}
              className="d-mono w-full rounded-full bg-[var(--d-coral)] px-6 py-3 text-[12px] font-medium uppercase tracking-[0.22em] text-[#0B0B15] transition-all hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(240,160,156,0.32)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              Mulai Bertugas →
            </button>
            <p className="d-serif text-[11.5px] italic text-[var(--d-ink-faint)]">
              Bisa juga nama panggilan, misal &ldquo;Rina&rdquo; atau
              &ldquo;Mas Adi&rdquo;.
            </p>
          </form>
        ) : (
          <>
            <div
              className={`mt-7 flex justify-center gap-3 ${
                pinError ? "animate-shake" : ""
              }`}
              onAnimationEnd={() => {
                if (pinError) setPinError(pinError);
              }}
            >
              {pinDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  disabled={verifying}
                  aria-label={`Digit PIN ke-${i + 1}`}
                  className={`h-16 w-14 rounded-xl border bg-[rgba(255,255,255,0.025)] text-center font-mono text-[24px] text-[var(--d-ink)] outline-none transition-colors ${
                    pinError
                      ? "border-[#E08A8A]"
                      : "border-[var(--d-line-strong)] focus:border-[var(--d-coral)] focus:bg-[rgba(240,160,156,0.04)]"
                  }`}
                />
              ))}
            </div>
            {pinError && (
              <p className="d-serif mt-4 text-[13px] italic text-[#E08A8A]">
                {pinError}
              </p>
            )}
            <button
              type="button"
              onClick={() => submitPin(pinDigits.join(""))}
              disabled={pinDigits.join("").length < 4 || verifying}
              className="d-mono mt-7 w-full rounded-full bg-[var(--d-coral)] px-6 py-3 text-[12px] font-medium uppercase tracking-[0.22em] text-[#0B0B15] transition-all hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(240,160,156,0.32)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {verifying ? "Memverifikasi…" : "Masuk →"}
            </button>
            <p className="d-serif mt-5 text-[11.5px] italic text-[var(--d-ink-faint)]">
              Hubungi pasangan jika tidak punya PIN.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
