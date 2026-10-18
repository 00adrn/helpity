"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { pop } from "@/lib/motion";
import type { PresetLevel } from "@/lib/problems/presets";

export const LEVELS: { value: PresetLevel; label: string }[] = [
  { value: "elementary", label: "Elementary" },
  { value: "middle", label: "Middle School" },
  { value: "high", label: "High School" },
  // The empty "blank" preset is a link under the problem picker instead.
];

type EducationLevelSelectProps = {
  value: PresetLevel | null;
  onChange(level: PresetLevel): void;
  className?: string;
};

/** The Figma "Education level dropdown": a trigger and a small menu of levels. */
export function EducationLevelSelect({ value, onChange, className = "" }: EducationLevelSelectProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedLabel = LEVELS.find((level) => level.value === value)?.label;

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
    <div ref={root} data-no-drag className={`relative z-[300] w-[294px] ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[51px] w-full items-center justify-between rounded-xl border border-border bg-surface px-5 text-[22px] leading-8 font-semibold text-fg transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {selectedLabel ?? (open ? "Select" : "Education Level")}
        <Image
          src="/chevron-down.svg"
          alt=""
          width={26}
          height={26}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...pop}
            style={{ transformOrigin: "top center" }}
            className="absolute top-full right-0 left-0 mt-1.5 flex flex-col gap-1.5 rounded-xl border border-border bg-surface px-5 py-3 shadow-sm"
          >
            <p className="text-[19px] leading-[26px] font-semibold text-muted">Education level</p>
            <ul id={listId} role="listbox" aria-label="Education level" className="flex flex-col gap-1.5">
              {LEVELS.map((level) => {
                const selected = level.value === value;
                return (
                  <li key={level.value} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(level.value);
                        setOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-1.5 text-left text-[22px] leading-8 font-semibold transition focus-visible:outline-2 focus-visible:outline-accent ${
                        selected ? "bg-accent text-on-accent" : "text-fg hover:bg-surface-sunken"
                      }`}
                    >
                      {level.label}
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
