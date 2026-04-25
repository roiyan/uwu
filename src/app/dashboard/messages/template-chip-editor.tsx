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

const KNOWN_CHIP_CLASS =
  "tpl-chip mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 " +
  "font-sans text-[12px] font-medium select-none align-baseline " +
  "bg-navy/10 text-navy";

const UNKNOWN_CHIP_CLASS =
  "tpl-chip mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 " +
  "font-sans text-[12px] font-medium select-none align-baseline " +
  "bg-rose-50 text-rose-dark";

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
    const known = labelByKey.has(key);
    const label = labelByKey.get(key) ?? key;
    const cls = known ? KNOWN_CHIP_CLASS : UNKNOWN_CHIP_CLASS;
    out +=
      `<span class="${cls}" data-key="${escapeAttr(key)}" contenteditable="false">` +
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
  const known = labelByKey.has(key);
  const label = labelByKey.get(key) ?? key;
  const span = document.createElement("span");
  span.className = known ? KNOWN_CHIP_CLASS : UNKNOWN_CHIP_CLASS;
  span.setAttribute("data-key", key);
  span.setAttribute("contenteditable", "false");
  span.textContent = label;
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
    <div className="rounded-lg border border-[color:var(--border-medium)] bg-white">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[color:var(--border-ghost)] bg-surface-muted/40 p-2">
        <span className="mr-1 text-[11px] font-medium text-ink-muted">
          Sisipkan:
        </span>
        {placeholders.map((p) => {
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
                  ? "Sudah ada di template (klik untuk tambah lagi)"
                  : `Sisipkan {${p.key}}`
              }
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                isUsed
                  ? "border-[#3B7A57]/30 bg-[#E8F3EE] text-[#3B7A57] hover:bg-[#D6EADC]"
                  : "border-[color:var(--border-ghost)] bg-white text-ink-muted hover:bg-surface-muted"
              }`}
            >
              <span className="text-[10px] opacity-70">{isUsed ? "✓" : "+"}</span>
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
