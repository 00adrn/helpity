"use client";

import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "motion/react";

import { spriteUrl } from "@/lib/ai/emotion";
import {
  HELPITY_LEVEL_EXAMPLES,
  HELPITY_LEVEL_LABELS,
  HELPITY_LEVELS,
  type HelpityLevel,
} from "@/lib/ai/levels";

/** Typing speed of the sample answer, and how often Helpity's mouth flaps while it types. */
const TYPE_MS_PER_CHAR = 18;
const FLAP_MS = 140;

/**
 * The teacher's choice of how Helpity, the students' AI assistant, talks. A segmented control,
 * then Helpity "saying" a sample answer at the selected level. "large" on the setup screen,
 * "small" in the session's results panel header.
 */
export function HelpityLevelPicker({
  value,
  onChange,
  size = "large",
  disabled = false,
  preview = true,
}: {
  value: HelpityLevel;
  onChange(level: HelpityLevel): void;
  size?: "large" | "small";
  disabled?: boolean;
  /** Helpity saying a sample answer. Off in the session's settings menu. */
  preview?: boolean;
}) {
  const labelId = useId();
  const large = size === "large";

  return (
    // whitespace-normal: the navbar menu and phone sheet that hold this keep their text on one line.
    <div className={`flex flex-col whitespace-normal ${large ? "gap-3" : "gap-2.5"}`}>
      <span id={labelId} className={`font-semibold text-fg ${large ? "text-sm" : "text-xs"}`}>
        How should Helpity (AI assistant) talk to students?
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-surface"
      >
        {HELPITY_LEVELS.map((level) => {
          const selected = level === value;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(level)}
              className={`font-semibold whitespace-nowrap transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ${
                large ? "h-11 text-sm" : "h-8 text-sm"
              } ${selected ? "bg-accent text-on-accent" : "text-fg hover:bg-surface-sunken"}`}
            >
              {HELPITY_LEVEL_LABELS[level]}
            </button>
          );
        })}
      </div>
      {/* Keyed by level so the sample restarts from the first letter on every change. */}
      {preview && <HelpitySample key={value} level={value} large={large} />}
    </div>
  );
}

/** Helpity typing out the sample answer for one level, mouth flapping until it finishes. */
function HelpitySample({ level, large }: { level: HelpityLevel; large: boolean }) {
  const text = HELPITY_LEVEL_EXAMPLES[level];
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  const [flap, setFlap] = useState(false);
  const typed = reduceMotion ? text.length : shown;
  const talking = typed < text.length;

  useEffect(() => {
    if (reduceMotion) return;
    const typing = setInterval(() => {
      setShown((count) => {
        if (count + 1 >= text.length) clearInterval(typing);
        return count + 1;
      });
    }, TYPE_MS_PER_CHAR);
    return () => clearInterval(typing);
  }, [text, reduceMotion]);

  useEffect(() => {
    if (!talking) return;
    const flapping = setInterval(() => setFlap((open) => !open), FLAP_MS);
    return () => clearInterval(flapping);
  }, [talking]);

  const sprite = talking ? (flap ? "flat" : "open") : "happy";
  const bubblePadding = large ? "px-4 py-3" : "px-3 py-2";
  const textSize = large ? "text-sm leading-5" : "text-xs leading-4";

  return (
    <figure className={`flex items-start ${large ? "mt-2 gap-3" : "mt-1 gap-2.5"}`}>
      {/* All three sprites stay mounted so flapping never waits on an image load. */}
      <div className={`relative shrink-0 ${large ? "size-14" : "size-10"}`} aria-hidden>
        {(["happy", "open", "flat"] as const).map((name) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={name}
            src={spriteUrl(name)}
            alt=""
            draggable={false}
            className={`absolute inset-0 size-full object-contain ${name === sprite ? "" : "invisible"}`}
          />
        ))}
      </div>
      {/* Invisible bubbles holding every level's sample reserve the tallest one, so the visible
          bubble can grow with the typing without moving anything else on the screen. */}
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)]">
        {HELPITY_LEVELS.map((other) => (
          <div
            key={other}
            aria-hidden
            className={`invisible col-start-1 row-start-1 border ${bubblePadding} ${textSize}`}
          >
            {HELPITY_LEVEL_EXAMPLES[other]}
          </div>
        ))}
        <figcaption
          className={`relative col-start-1 row-start-1 w-fit max-w-full self-start rounded-2xl border border-border bg-surface text-fg shadow-sm ${bubblePadding}`}
        >
          {/* The tail, pointing at Helpity. */}
          <span
            aria-hidden
            className={`absolute -left-[5px] size-2.5 rotate-45 border-b border-l border-border bg-surface ${large ? "top-[22px]" : "top-3.5"}`}
          />
          <span className="sr-only">
            Example of Helpity at the {HELPITY_LEVEL_LABELS[level]} level: {text}
          </span>
          <span aria-hidden className={`block ${textSize}`}>
            {text.slice(0, typed)}
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

