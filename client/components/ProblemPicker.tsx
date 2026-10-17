"use client";

import { useMemo, useState } from "react";

import { CarouselControls, pickerButton } from "@/components/CarouselControls";
import { EducationLevelSelect } from "@/components/EducationLevelSelect";
import { useCarousel } from "@/components/useCarousel";
import {
  presets,
  type PresetId,
  type PresetLevel,
} from "@/lib/problems/presets";

// Problem names slide sideways in a straight line (the avatar picker's motion, minus the arc).
const DRAG_PX_PER_PROBLEM = 320;
// Size of the problems beside the selected one, relative to it. They grow smoothly as they slide in.
const NEIGHBOR_SCALE = 0.55;

type ProblemPickerProps = {
  onCreate(presetId: PresetId): void;
  busy?: boolean;
  error?: string;
};

/** "Select a problem type": pick an education level, then swipe through its problems. */
export function ProblemPicker({
  onCreate,
  busy = false,
  error,
}: ProblemPickerProps) {
  const [level, setLevel] = useState<PresetLevel | null>(null);
  // No problems until a level is picked, then just that level's.
  const problems = useMemo(
    () =>
      (Object.entries(presets) as [PresetId, (typeof presets)[PresetId]][])
        .filter(([, preset]) => preset.level === level)
        .map(([id, preset]) => ({ id, title: preset.title })),
    [level],
  );
  const carousel = useCarousel(problems.length, {
    pxPerItem: DRAG_PX_PER_PROBLEM,
  });
  const selected = problems[carousel.selectedIndex];

  return (
    <main
      {...carousel.stageProps}
      className="relative flex flex-1 touch-pan-y flex-col items-center overflow-hidden overscroll-x-none bg-bg px-4 pt-[min(128px,20vh)] select-none [--item-w:min(640px,64vw)] [--step:min(560px,48vw)]"
    >
      <h1 className="text-4xl leading-none font-bold tracking-[-0.9px] text-fg">
        Select a problem type
      </h1>

      <EducationLevelSelect
        className="mt-8"
        value={level}
        onChange={(next) => {
          setLevel(next);
          carousel.reset();
        }}
      />

      {/* The selected problem sits in the middle; neighbours fade out to the sides. */}
      <div className="relative flex w-full flex-col items-center">
        {/* Centered in the whole gap between the dropdown and the button (the button's mt-10 included). */}
        {!level && (
          <p className="absolute inset-x-0 top-0 -bottom-10 flex items-center justify-center text-center text-xl font-semibold text-muted">
            Choose an education level to see its problems.
          </p>
        )}

        <div className="relative mt-14 h-32 w-full shrink-0">
          {problems.map((problem, index) => {
            const offset = carousel.offsetOf(index);
            const distance = Math.abs(offset);
            // Fade with distance, and fully out before an item wraps to the other side.
            const fade = Math.min(
              Math.max((problems.length / 2 - distance) / 0.5, 0),
              1,
            );
            const opacity =
              Math.min(Math.max(1 - 0.65 * distance, 0), 1) * fade;
            const isCenter = Math.round(offset) === 0;

            return (
              <button
                key={problem.id}
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => carousel.clickItem(offset)}
                className={`absolute top-0 left-1/2 -ml-[calc(var(--item-w)/2)] flex h-full w-(--item-w) cursor-pointer items-center justify-center text-center text-[clamp(32px,3.6vw,52px)] leading-tight font-bold tracking-[-1.2px] text-balance text-black ${carousel.itemTransition}`}
                style={{
                  transform: `translateX(calc(${offset} * var(--step))) scale(${1 - (1 - NEIGHBOR_SCALE) * Math.min(distance, 1)})`,
                  opacity,
                  pointerEvents: opacity > 0 && !isCenter ? "auto" : "none",
                }}
              >
                {problem.title}
              </button>
            );
          })}
        </div>

        <CarouselControls
          // Hidden (but still taking up space, so nothing jumps) until there's something to browse.
          className={`mt-24 ${level ? "" : "invisible"}`}
          noun="problem"
          index={carousel.selectedIndex}
          count={problems.length}
          selectedName={selected?.title ?? ""}
          onStep={carousel.turn}
        />
      </div>

      <button
        data-no-drag
        type="button"
        onClick={() => selected && onCreate(selected.id)}
        disabled={busy || !selected}
        className={`${pickerButton} mt-10`}
      >
        {busy ? "Creating…" : "Create session"}
      </button>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
