"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export type ChipPlaceholder = {
  /** Token rendered between curly braces — e.g. "nama" → {nama}. */
  key: string;
  /** Human-friendly label shown inside the chip. */
  label: string;
};

/**
 * Default placeholder set used by both WA and email broadcasts. Match
 * the keys recognised by renderTemplate() in lib/templates/messages.ts.
 */
export const DEFAULT_PLACEHOLDERS: ChipPlaceholder[] = [
  { key: "nama", label: "Nama Tamu" },
  { key: "panggilan", label: "Panggilan" },
  { key: "bride", label: "Mempelai Wanita" },
  { key: "groom", label: "Mempelai Pria" },
  { key: "date", label: "Tanggal" },
  { key: "venue", label: "Lokasi" },
  { key: "link_undangan", label: "Link Undangan" },
];

const PLACEHOLDER_RE = /\{([a-zA-Z0-9_]+)\}/g;

// Each placeholder type gets its own colour on both the toolbar pill
// and the inline chip rendered inside the editor. Keys are intentional —
// they map to the placeholder.key values (nama/panggilan/bride/groom/
// date/venue/link_undangan) rather than the human labels, so the
// colour stays consistent if a label is renamed.
type ChipColorKey = "blue" | "coral" | "lilac" | "gold" | "green" | "fallback";

type ChipColor = {
  bg: string;
  border: string;
  text: string;
  toolbarBg: string;
};

const CHIP_COLORS: Record<ChipColorKey, ChipColor> = {
  blue: {
    bg: "rgba(143,163,217,0.12)",
    border: "rgba(143,163,217,0.20)",
    text: "#8FA3D9",
    toolbarBg: "rgba(143,163,217,0.08)",
  },
  coral: {
    bg: "rgba(240,160,156,0.12)",
    border: "rgba(240,160,156,0.20)",
    text: "#F0A09C",
    toolbarBg: "rgba(240,160,156,0.08)",
  },
  lilac: {
    bg: "rgba(184,157,212,0.12)",
    border: "rgba(184,157,212,0.20)",
    text: "#B89DD4",
    toolbarBg: "rgba(184,157,212,0.08)",
  },
  gold: {
    bg: "rgba(212,184,150,0.12)",
    border: "rgba(212,184,150,0.20)",
    text: "#D4B896",
    toolbarBg: "rgba(212,184,150,0.08)",
  },
  green: {
    bg: "rgba(126,211,164,0.12)",
    border: "rgba(126,211,164,0.20)",
    text: "#7ED3A4",
    toolbarBg: "rgba(126,211,164,0.08)",
  },
  fallback: {
    // Used for unknown variable keys (legacy templates with custom
    // placeholders). Coral-tinted so they stand out as "needs review".
    bg: "rgba(240,160,156,0.10)",
    border: "rgba(240,160,156,0.25)",
    text: "#F0A09C",
    toolbarBg: "rgba(240,160,156,0.06)",
  },
};

function colorKeyFor(key: string): ChipColorKey {
  switch (key) {
    case "nama":
    case "panggilan":
      return "blue";
    case "bride":
    case "groom":
      return "coral";
    case "date":
      return "lilac";
    case "venue":
      return "gold";
    case "link_undangan":
      return "green";
    default:
      return "fallback";
  }
}

// Inline style string for an editor chip span. Anti-pattern in the
// spec: chips MUST use inline styles, not CSS classes — contentEditable
// + Tailwind has historically been flaky around the focus/caret math.
// `tpl-chip` stays as a marker class because toTemplate() relies on
// classList.contains("tpl-chip") to detect chip nodes during the
// DOM → template-string round-trip.
function chipStyleString(key: string): string {
  const c = CHIP_COLORS[colorKeyFor(key)];
  return [
    "display:inline-flex",
    "align-items:center",
    "gap:4px",
    "padding:2px 9px",
    "border-radius:6px",
    `background:${c.bg}`,
    `color:${c.text}`,
    `border:1px solid ${c.border}`,
    "font-family:'Inter',sans-serif",
    "font-size:11.5px",
    "font-weight:500",
    "letter-spacing:0",
    "margin:0 1px",
    "user-select:all",
    "white-space:nowrap",
    "vertical-align:baseline",
  ].join(";");
}

const CHIP_DOT_STYLE =
  "display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;opacity:0.7;flex-shrink:0";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(text: string): string {
  return text.replace(/"/g, "&quot;");
}

/**
 * Render a template string to HTML — text + <br> + atomic chip spans.
 * Used only by the two paths that legitimately need to repaint:
 * initial mount and external value changes (template switch, AI apply).
 */
function toHtml(value: string, placeholders: ChipPlaceholder[]): string {
  const labelByKey = new Map(placeholders.map((p) => [p.key, p.label]));
  let out = "";
  let cursor = 0;
  PLACEHOLDER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
    const before = value.slice(cursor, match.index);
    if (before) out += escapeHtml(before).replace(/\n/g, "<br>");
    const key = match[1];
    const label = labelByKey.get(key) ?? key;
    out +=
      `<span class="tpl-chip" data-key="${escapeAttr(key)}" ` +
      `contenteditable="false" style="${escapeAttr(chipStyleString(key))}">` +
      `<span aria-hidden="true" style="${escapeAttr(CHIP_DOT_STYLE)}"></span>` +
      escapeHtml(label) +
      `</span>`;
    cursor = match.index + match[0].length;
  }
  const tail = value.slice(cursor);
  if (tail) out += escapeHtml(tail).replace(/\n/g, "<br>");
  return out;
}

/**
 * Walk the editor DOM and serialise back to a template string with
 * `{key}` tokens. Treats <br> and DIV/P boundaries as newlines.
 */
function toTemplate(editor: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const chipKey = el.getAttribute("data-key");
    if (chipKey && el.classList.contains("tpl-chip")) {
      out += `{${chipKey}}`;
      return;
    }
    if (el.tagName === "BR") {
      out += "\n";
      return;
    }
    const isBlock = el.tagName === "DIV" || el.tagName === "P";
    if (isBlock && out.length > 0 && !out.endsWith("\n")) {
      out += "\n";
    }
    el.childNodes.forEach(walk);
  };
  editor.childNodes.forEach(walk);
  // NBSP added after chips for caret-stability becomes a regular
  // space in the serialised template; ZWSP if any survives is dropped.
  return out.replace(/​/g, "").replace(/ /g, " ");
}

function buildChipElement(
  key: string,
  placeholders: ChipPlaceholder[],
): HTMLElement {
  const labelByKey = new Map(placeholders.map((p) => [p.key, p.label]));
  const label = labelByKey.get(key) ?? key;
  const span = document.createElement("span");
  // tpl-chip stays as a marker class so toTemplate() can still detect
  // chip nodes during DOM → template-string round-trip; all visual
  // styling is on the inline `style` attribute.
  span.className = "tpl-chip";
  span.setAttribute("data-key", key);
  span.setAttribute("contenteditable", "false");
  span.setAttribute("style", chipStyleString(key));
  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  dot.setAttribute("style", CHIP_DOT_STYLE);
  span.appendChild(dot);
  span.appendChild(document.createTextNode(label));
  return span;
}

/**
 * Atomic-chip template editor. Placeholders render as non-editable
 * pills — tap once to insert via the toolbar, single Backspace deletes
 * the whole chip. Operates as a fully-uncontrolled contentEditable:
 * we paint the DOM ourselves on mount and on external value changes,
 * and we NEVER reset innerHTML in response to our own onChange — that
 * would snap the caret to position 0 on every keystroke.
 */
export function TemplateChipEditor({
  value,
  onChange,
  name,
  minHeight = 220,
  placeholders = DEFAULT_PLACEHOLDERS,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  name?: string;
  minHeight?: number;
  placeholders?: ChipPlaceholder[];
  ariaLabel?: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  // Tracks the most recent external value (from the prop). Internal
  // edits are tracked separately by isUserEditingRef so the value-sync
  // effect can tell them apart from genuine outside-driven changes.
  const lastExternalValueRef = useRef<string>(value);
  const isUserEditingRef = useRef(false);

  // Mount-only: paint the initial DOM from the prop. Empty deps are
  // intentional — we never want this to fire again.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = toHtml(value, placeholders);
    lastExternalValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Value-sync: the prop has changed since we last looked. If the
  // change came from us (user typing or chip insert), the DOM is
  // already correct — clear the flag and exit. Otherwise (template
  // switch, AI apply), repaint.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isUserEditingRef.current) {
      isUserEditingRef.current = false;
      lastExternalValueRef.current = value;
      return;
    }
    if (value === lastExternalValueRef.current) return;
    lastExternalValueRef.current = value;
    el.innerHTML = toHtml(value, placeholders);
  }, [value, placeholders]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isUserEditingRef.current = true;
    onChange(toTemplate(el));
  }, [onChange]);

  const insertAtCaret = useCallback(
    (key: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      const chip = buildChipElement(key, placeholders);
      // NBSP after chip so the caret has a stable text node to land in
      // and the user doesn't end up "inside" the chip's neighbour.
      const after = document.createTextNode(" ");

      if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
        el.appendChild(chip);
        el.appendChild(after);
        const range = document.createRange();
        range.setStart(after, 1);
        range.collapse(true);
        const sel2 = window.getSelection();
        sel2?.removeAllRanges();
        sel2?.addRange(range);
      } else {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(after);
        range.insertNode(chip);
        const newRange = document.createRange();
        newRange.setStart(after, 1);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }

      isUserEditingRef.current = true;
      onChange(toTemplate(el));
    },
    [onChange, placeholders],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Backspace") return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;

      // Find the node immediately before the caret. If it's a chip
      // span, remove it as a whole — defensive: most browsers handle
      // this for contentEditable=false already, but Safari has been
      // historically inconsistent.
      let nodeBefore: Node | null = null;
      const { startContainer, startOffset } = range;
      if (startContainer.nodeType === Node.TEXT_NODE) {
        if (startOffset === 0) {
          nodeBefore = startContainer.previousSibling;
        }
      } else if (startContainer === editorRef.current) {
        const idx = startOffset - 1;
        if (idx >= 0) nodeBefore = startContainer.childNodes[idx];
      }

      if (
        nodeBefore instanceof HTMLElement &&
        nodeBefore.classList.contains("tpl-chip")
      ) {
        e.preventDefault();
        nodeBefore.remove();
        handleInput();
      }
    },
    [handleInput],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      // Strip rich-text — paste as plain text only. Auto-converting
      // pasted "{nama}" into chips is intentionally NOT done here:
      // the user can re-insert via the toolbar; pasting between
      // editors should round-trip as the canonical template string.
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      document.execCommand("insertText", false, text);
      handleInput();
    },
    [handleInput],
  );

  // Set of placeholder keys currently present in the value — drives
  // the "used" green styling on toolbar chips.
  const usedKeys = useMemo(() => {
    const used = new Set<string>();
    PLACEHOLDER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
      used.add(match[1]);
    }
    return used;
  }, [value]);

  return (
    <div className="rounded-lg border border-[var(--d-line-strong)] bg-[var(--d-bg-card)]">
      {/* Toolbar sticks below the mobile dashboard header (~56px) so
          chips remain reachable even with the on-screen keyboard
          eating most of the viewport. Solid background (no /40 alpha)
          so chips stay legible when overlapping editor body. */}
      <div className="sticky top-[56px] z-20 flex flex-wrap items-center gap-2 rounded-t-lg border-b border-[var(--d-line)] bg-[var(--d-bg-card)] px-3 py-2.5 lg:top-0">
        <span className="d-mono mr-1 text-[9px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
          Sisipkan:
        </span>
        {placeholders.map((p) => {
          const c = CHIP_COLORS[colorKeyFor(p.key)];
          const isUsed = usedKeys.has(p.key);
          return (
            <button
              key={p.key}
              type="button"
              // CRITICAL: onMouseDown + preventDefault keeps the editor
              // focused and the selection alive. Using onClick would
              // blur the editor first, getSelection() returns null,
              // and the chip lands at the wrong position (or not at
              // all).
              onMouseDown={(e) => {
                e.preventDefault();
                insertAtCaret(p.key);
              }}
              title={
                isUsed
                  ? `${p.label} sudah ada di template — klik untuk tambah lagi`
                  : `Sisipkan ${p.label}`
              }
              // Inline styles per type so the toolbar pill colour stays
              // in lockstep with the inline chip rendered in the editor
              // body. Used-state reduces opacity slightly so re-inserts
              // are still visible but don't dominate. We avoid CSS
              // class colors here for the same reason chips do — keeps
              // colour resolution out of any cascade and makes the
              // styling identical to what `chipStyleString` produces.
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 999,
                background: c.toolbarBg,
                border: `1px solid ${c.border}`,
                color: c.text,
                fontSize: 11,
                lineHeight: 1.4,
                fontWeight: 500,
                fontFamily: "Inter, system-ui, sans-serif",
                cursor: "pointer",
                opacity: isUsed ? 0.7 : 1,
                transition: "opacity 0.18s, background 0.18s",
              }}
            >
              {/* Always plus — toolbar inserts; "used" state is conveyed
                  via opacity + tooltip, not by switching the icon. */}
              <svg
                viewBox="0 0 24 24"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {p.label}
            </button>
          );
        })}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        spellCheck={false}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none focus:shadow-[var(--focus-ring-navy)]"
        style={{ minHeight, whiteSpace: "pre-wrap" }}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
