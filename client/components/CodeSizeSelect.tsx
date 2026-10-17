"use client";

import { useEffect, useId, useRef, useState } from "react";

import { CODE_SIZES, setCodeSize, useCodeSize } from "@/lib/editor/codeSize";

/** The Figma navbar "Select": a small square button with a menu for the code text size. */
export function CodeSizeSelect() {
  const size = useCodeSize();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative z-30">
      <button
        type="button"
        aria-label="Code size"
        title="Make the code bigger or smaller"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        // Same border, padding and line height as the other navbar buttons, so it's the same height.
        className="min-w-[34px] rounded-lg border border-border bg-surface px-2 py-1.5 text-sm leading-5 font-bold text-muted transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Aa
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 flex w-[184px] flex-col gap-1 rounded-lg border border-border bg-surface px-3 py-2 shadow-sm">
          <p className="text-xs leading-4 font-semibold text-muted">How big is the code?</p>
          <ul id={listId} role="listbox" aria-label="Code size" className="flex flex-col gap-1">
            {CODE_SIZES.map((option) => {
              const selected = option.value === size;
              return (
                <li key={option.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      setCodeSize(option.value);
                      setOpen(false);
                    }}
                    className={`h-7 w-full rounded-md px-2 py-1 text-left text-sm leading-5 font-semibold transition focus-visible:outline-2 focus-visible:outline-accent ${
                      selected ? "bg-accent text-on-accent" : "text-fg hover:bg-surface-sunken"
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
