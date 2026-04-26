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
  operatorSessionStorageKey,
  operatorSessionValue,
} from "@/lib/utils/operator";

/**
 * 4-digit PIN gate that sits in front of the public check-in station.
 * Renders three states:
 *   1. checking — saved session is being re-validated against the
 *      server (covers reload / day-of-event return).
 *   2. authenticated — children render. The page below is the same
 *      CheckinStation the dashboard uses with `variant="public"`.
 *   3. needs-pin — keypad screen. On success we save the session
 *      to localStorage so a quick reload doesn't re-prompt.
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
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<"checking" | "needs-pin" | "ready">(
    "checking",
  );
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Mount: re-validate any saved session against the server. If the
  // saved pair no longer matches (link reset, check-in toggled off),
  // we drop it and prompt for PIN.
  useEffect(() => {
    if (!token) {
      // No token in URL means the operator opened a malformed link.
      // Show the keypad so the error message is visible — the verify
      // call will fail with "Link operator tidak berlaku".
      setPhase("needs-pin");
      return;
    }
    const storedKey = operatorSessionStorageKey(eventId);
    const saved =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(storedKey);
    if (!saved) {
      setPhase("needs-pin");
      return;
    }
    let cancelled = false;
    verifyOperatorSessionAction(eventId, saved).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setPhase("ready");
      } else {
        // Stale session — drop it and ask for the PIN again.
        window.localStorage.removeItem(storedKey);
        setPhase("needs-pin");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, token]);

  // Auto-focus the first digit when the keypad becomes visible.
  useEffect(() => {
    if (phase === "needs-pin") {
      inputRefs.current[0]?.focus();
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
      // Defer slightly so the digit visually lands before submit.
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

  // Allow paste of a 4-digit string into any input — common pattern
  // for operators who copy the PIN out of a chat message.
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
      setPinError("Link tidak valid. Minta link baru ke pasangan.");
      return;
    }
    setVerifying(true);
    setPinError(null);
    const res = await verifyOperatorPinAction(eventId, token, pin);
    if (res.ok && res.data) {
      const sessionKey = operatorSessionValue(token, pin);
      // res.data.sessionKey == sessionKey by construction; storing the
      // local-built one means we don't have to special-case the data
      // shape if it changes server-side.
      try {
        window.localStorage.setItem(
          operatorSessionStorageKey(eventId),
          sessionKey,
        );
      } catch {
        // Private browsing modes can throw; the operator can still
        // continue, just won't get session persistence on reload.
      }
      setPhase("ready");
      return;
    }
    setPinError(
      res.ok ? "Verifikasi gagal. Coba lagi." : res.error,
    );
    setPinDigits(["", "", "", ""]);
    inputRefs.current[0]?.focus();
    setVerifying(false);
  }

  if (phase === "ready") return <>{children}</>;

  // Both "checking" and "needs-pin" share the same dark backdrop —
  // the keypad just renders empty during the brief re-check, which
  // avoids a flash of "needs-pin" when the saved session is valid.
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
        </span>

        <h2 className="d-serif mt-5 text-[22px] font-light text-[var(--d-ink)]">
          Masukkan{" "}
          <em className="d-serif italic text-[var(--d-coral)]">PIN</em>
        </h2>
        <p className="d-serif mt-1.5 text-[13px] italic text-[var(--d-ink-dim)]">
          PIN diberikan oleh pasangan pengantin.
        </p>

        {phase === "checking" ? (
          <p className="d-mono mt-8 text-[10px] uppercase tracking-[0.24em] text-[var(--d-ink-faint)]">
            Memeriksa sesi…
          </p>
        ) : (
          <>
            <div
              className={`mt-7 flex justify-center gap-3 ${
                pinError ? "animate-shake" : ""
              }`}
              onAnimationEnd={() => {
                // Strip the class after the shake completes so the
                // next error can re-trigger a fresh animation.
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
