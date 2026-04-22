"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ToastLevel = "success" | "error" | "info";
type Toast = { id: number; level: ToastLevel; message: string };

type ToastApi = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Safe no-op fallback if a component renders outside the provider —
    // prevents crashes in edge cases (e.g. Storybook).
    return {
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((level: ToastLevel, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, level, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const api: ToastApi = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 10);
    return () => window.clearTimeout(id);
  }, []);

  const style =
    toast.level === "success"
      ? "bg-[#E8F3EE] text-[#3B7A57] border-[#3B7A57]/20"
      : toast.level === "error"
        ? "bg-rose-50 text-rose-dark border-rose/20"
        : "bg-navy-50 text-navy border-navy/20";
  const icon =
    toast.level === "success" ? "✓" : toast.level === "error" ? "⚠" : "·";

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-medium shadow-ghost-md transition-all duration-200 ${style} ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <span>{icon}</span>
      <span>{toast.message}</span>
    </div>
  );
}
