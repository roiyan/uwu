"use client";

import { useEffect, useMemo, useRef } from "react";

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

const KNOWN_KEYS = new Set(DEFAULT_PLACEHOLDERS.map((p) => p.key));
const PLACEHOLDER_RE = /\{([a-zA-Z0-9_]+)\}/g;

function labelFor(key: string): string {
  const found = DEFAULT_PLACEHOLDERS.find((p) => p.key === key);
  return found?.label ?? key;
}

/**
 * Parse a template string into a fresh DOM fragment: plain text +
 * `<br>` for newlines + atomic `<span>` chips for each {placeholder}.
 */
function valueToFragment(value: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  let cursor = 0;
  PLACEHOLDER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
    const before = value.slice(cursor, match.index);
    if (before) appendTextWithBreaks(frag, before);
    frag.appendChild(buildChip(match[1]));
    cursor = match.index + match[0].length;
  }
  const tail = value.slice(cursor);
  if (tail) appendTextWithBreaks(frag, tail);
  return frag;
}

function appendTextWithBreaks(parent: Node, text: string) {
  const parts = text.split("\n");
  parts.forEach((part, i) => {
    if (part) parent.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) parent.appendChild(document.createElement("br"));
  });
}

function buildChip(key: string): HTMLElement {
  const known = KNOWN_KEYS.has(key);
  const span = document.createElement("span");
  span.setAttribute("data-chip", key);
  span.setAttribute("contenteditable", "false");
  span.className = [
    "mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5",
    "font-sans text-[12px] font-medium select-none align-baseline",
    known
      ? "bg-navy/10 text-navy"
      : "bg-rose-50 text-rose-dark",
  ].join(" ");
  span.textContent = labelFor(key);
  return span;
}

/**
 * Walk the editor DOM and serialise back to a template string with
 * `{key}` tokens. Treats <br> and block boundaries as newlines.
 */
function nodeToValue(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const chipKey = el.getAttribute("data-chip");
    if (chipKey) {
      out += `{${chipKey}}`;
      return;
    }
    if (el.tagName === "BR") {
      out += "\n";
      return;
    }
    // For DIV/P (browsers wrap each new line in a block), emit a
    // newline before the inner content unless we're already at a
    // newline boundary (start of buffer or just after a \n).
    const isBlock = el.tagName === "DIV" || el.tagName === "P";
    if (isBlock && out.length > 0 && !out.endsWith("\n")) {
      out += "\n";
    }
    el.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return out;
}

/**
 * Atomic-chip template editor. Placeholders render as non-editable
 * pills — tap once to insert via the toolbar, single Backspace deletes
 * the whole chip. Falls back to a hidden <input> so the surrounding
 * form's FormData still picks up the serialised template string.
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
  // Tracks the last value we rendered into the DOM. We only re-render
  // (which blows away the caret) when the prop value drifts away from
  // what we've already painted — i.e. when an external callsite (AI
  // modal, template switch) replaces the body wholesale.
  const lastRenderedRef = useRef<string>("");
  // After we mutate the DOM ourselves (insertAtCaret), the parent
  // round-trips the new value back via the `value` prop. Without this
  // guard, the value-sync useEffect would wipe innerHTML and snap the
  // caret to the start of the editor.
  const skipNextRenderRef = useRef(false);

  // Set of placeholder keys currently present in the value — drives
  // the "used" green styling on toolbar chips. Recomputes on every
  // value change (typing, chip delete, template switch, AI apply).
  const usedKeys = useMemo(() => {
    const used = new Set<string>();
    PLACEHOLDER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
      used.add(match[1]);
    }
    return used;
  }, [value]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (skipNextRenderRef.current) {
      // We already mutated the DOM in insertAtCaret; just sync the
      // ref with the value we already painted and skip the reset so
      // the caret stays put.
      skipNextRenderRef.current = false;
      lastRenderedRef.current = value;
      return;
    }
    if (value === lastRenderedRef.current) return;
    el.innerHTML = "";
    el.appendChild(valueToFragment(value));
    lastRenderedRef.current = value;
  }, [value]);

  function commit() {
    const el = editorRef.current;
    if (!el) return;
    const next = nodeToValue(el);
    lastRenderedRef.current = next;
    onChange(next);
  }

  function insertAtCaret(key: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    const chip = buildChip(key);
    // Trailing space so the user can keep typing without ending up
    // inside the chip's neighbour text node by accident.
    const space = document.createTextNode(" ");

    if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
      el.appendChild(chip);
      el.appendChild(space);
      // Park the caret right after the trailing space.
      const range = document.createRange();
      range.setStartAfter(space);
      range.collapse(true);
      const sel2 = window.getSelection();
      sel2?.removeAllRanges();
      sel2?.addRange(range);
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(space);
      range.insertNode(chip);
      range.setStartAfter(space);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // Skip the next value-sync useEffect pass — we already painted
    // the chip + caret ourselves and don't want innerHTML reset.
    skipNextRenderRef.current = true;
    const next = nodeToValue(el);
    lastRenderedRef.current = next;
    onChange(next);
  }

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
              onMouseDown={(e) => {
                // Prevent the editor from losing focus before we insert.
                e.preventDefault();
              }}
              onClick={() => insertAtCaret(p.key)}
              title={
                isUsed
                  ? `Sudah ada di template (klik untuk tambah lagi)`
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
        onInput={commit}
        onBlur={commit}
        onKeyDown={(e) => {
          // Browsers handle Backspace on a chip span (contenteditable
          // false) atomically — they remove the whole element. We just
          // need to ensure the input event fires; nothing to do here.
          if (e.key === "Enter" && !e.shiftKey) {
            // Default contentEditable Enter behaviour wraps in <div>
            // which we already serialise back to \n. Allow it.
          }
        }}
        className="px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none focus:shadow-[var(--focus-ring-navy)]"
        style={{ minHeight, whiteSpace: "pre-wrap" }}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
