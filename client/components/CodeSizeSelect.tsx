"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

import { HelpityLevelPicker } from "@/components/HelpityLevelPicker";
import { SettingsIcon } from "@/components/Icons";
import type { HelpityLevel } from "@/lib/ai/levels";
import { CODE_SIZES, codeSizeCopy, setCodeSize, useCodeSize } from "@/lib/editor/codeSize";
import { pop } from "@/lib/motion";

/** Teacher only: how Helpity talks to students, shown in the same menu as the code size. */
export type HelpitySetting = { level: HelpityLevel; onChange(level: HelpityLevel): void; disabled?: boolean };

/**
 * The Figma navbar "Select": a small square button with a menu for the code text size. Teachers
 * pass `helpity` and the same menu also sets how Helpity talks to students.
 */
export function CodeSizeSelect({ helpity, kid = false }: { helpity?: HelpitySetting; kid?: boolean }) {
  const size = useCodeSize();
  const copy = codeSizeCopy(kid);
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
        aria-label={helpity ? "Settings" : "Code size"}
        title={helpity ? "Settings: code size and how Helpity talks" : "Make the code bigger or smaller"}
        aria-haspopup={helpity ? "dialog" : "listbox"}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        // Same border, padding and line height as the other navbar buttons, so it's the same height.
        className="inline-flex min-w-[34px] items-center justify-center rounded-lg border border-border bg-surface px-2 py-1.5 text-sm leading-5 font-bold text-muted transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {helpity ? (
          // Same 20px line box as "Aa", so the button keeps the navbar's height.
          <span className="flex size-5 items-center justify-center">
            <SettingsIcon className="size-[18px]" />
          </span>
        ) : (
          "Aa"
        )}
      </button>

      <AnimatePresence>
        {open && helpity && (
          <motion.div
            {...pop}
            id={listId}
            role="dialog"
            aria-label="Settings"
            style={{ transformOrigin: "top right" }}
            className="absolute top-full right-0 mt-2 flex w-[340px] flex-col whitespace-normal rounded-xl border border-border bg-surface shadow-sm"
          >
            <div className="p-4">
              <CodeSizeSegments compact kid={kid} />
            </div>
            <div className="border-t border-border p-4">
              <HelpityLevelPicker
                size="small"
                value={helpity.level}
                disabled={helpity.disabled}
                onChange={helpity.onChange}
                preview={false}
              />
            </div>
          </motion.div>
        )}
        {open && !helpity && (
          <motion.div
            {...pop}
            style={{ transformOrigin: "top right" }}
            className="absolute top-full right-0 mt-2 flex w-[184px] flex-col gap-1 rounded-lg border border-border bg-surface px-3 py-2 shadow-sm"
          >
            <p className="text-xs leading-4 font-semibold text-muted">{copy.heading}</p>
            <ul id={listId} role="listbox" aria-label={copy.heading} className="flex flex-col gap-1">
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
                      {copy.label(option.value, option.label)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The same choice as a segmented control: in the phone's Options sheet, and (`compact`) in the
 * teacher's settings menu. Same bordered look as Helpity's level picker.
 */
export function CodeSizeSegments({ compact = false, kid = false }: { compact?: boolean; kid?: boolean }) {
  const size = useCodeSize();
  const copy = codeSizeCopy(kid);
  const labelId = useId();

  return (
    <div className={`flex flex-col ${compact ? "gap-2.5" : "gap-3"}`}>
      <p id={labelId} className={`font-semibold text-fg ${compact ? "text-xs" : "text-sm"}`}>
        {copy.heading}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-surface"
      >
        {CODE_SIZES.map((option) => {
          const selected = option.value === size;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setCodeSize(option.value)}
              className={`font-semibold transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                compact ? "h-8 text-sm" : "h-11 text-base"
              } ${selected ? "bg-accent text-on-accent" : "text-fg hover:bg-surface-sunken"}`}
            >
              {copy.label(option.value, option.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
