"use client";

import { useState } from "react";

import { Avatar, avatarName, shuffledAvatars, type AvatarId } from "@/components/Avatar";
import { CarouselControls, pickerButton } from "@/components/CarouselControls";
import { useCarousel } from "@/components/useCarousel";

// The avatars sit on the rim of a wheel whose pivot is below the selected one.
// Each item's transform is `rotate(a) translateY(-R) rotate(-a)`: CSS interpolates the two
// rotations, so changing `a` swings the item along the arc while it stays upright.
const STEP_DEG = 40;
const VISIBLE = 2; // neighbours shown on each side; the next one fades in while scrolling
const SCALES = [1, 0.92, 0.8, 0.7]; // by distance from the selected avatar (Figma: 250/230/200)
const DRAG_PX_PER_AVATAR = 220; // how far a drag or side-scroll moves the wheel by one avatar

/** Scale for a fractional distance, interpolating between the SCALES steps. */
function scaleAt(distance: number) {
  const low = Math.min(Math.floor(distance), SCALES.length - 1);
  const high = Math.min(low + 1, SCALES.length - 1);
  return SCALES[low] + (SCALES[high] - SCALES[low]) * (distance - Math.floor(distance));
}

type AvatarPickerProps = {
  onPick(avatar: AvatarId): void;
  busy?: boolean;
};

/** "Select your avatar": a circular, looping carousel of every avatar in random order. */
export function AvatarPicker({ onPick, busy = false }: AvatarPickerProps) {
  // Only mounted after the student submits their code, never on the server, so a random
  // initial order can't cause a hydration mismatch.
  const [order] = useState(shuffledAvatars);
  const carousel = useCarousel(order.length, { pxPerItem: DRAG_PX_PER_AVATAR });
  const selected = order[carousel.selectedIndex];

  return (
    <main
      {...carousel.stageProps}
      className="relative flex flex-1 touch-pan-y flex-col items-center overflow-hidden overscroll-x-none bg-bg px-4 pt-[min(128px,20vh)] select-none [--avatar:min(200px,26vw)] [--wheel-r:min(512px,38vw)]"
    >
      <h1 className="text-4xl leading-none font-bold tracking-[-0.9px] text-fg">
        Select your avatar
      </h1>

      {/* The selected avatar's slot; the wheel's pivot hangs below its center. */}
      <div className="relative mt-12 size-(--avatar) shrink-0">
        <div className="absolute top-[calc(50%+var(--wheel-r))] left-1/2">
          {order.map((id, index) => {
            const offset = carousel.offsetOf(index);
            const distance = Math.abs(offset);
            const opacity = Math.min(Math.max(VISIBLE + 1 - distance, 0), 1);
            const angle = offset * STEP_DEG;
            const isCenter = Math.round(offset) === 0;

            return (
              <button
                key={id}
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => carousel.clickItem(offset)}
                className={`absolute -top-[calc(var(--avatar)/2)] -left-[calc(var(--avatar)/2)] size-(--avatar) cursor-pointer rounded-full ${carousel.itemTransition}`}
                style={{
                  transform: `rotate(${angle}deg) translateY(calc(-1 * var(--wheel-r))) rotate(${-angle}deg) scale(${scaleAt(distance)})`,
                  opacity,
                  pointerEvents: opacity > 0 && !isCenter ? "auto" : "none",
                  zIndex: 100 - Math.round(distance * 10),
                }}
              >
                <Avatar id={id} size={200} className="size-full" />
              </button>
            );
          })}
        </div>
      </div>

      <CarouselControls
        className="mt-24"
        noun="avatar"
        index={carousel.selectedIndex}
        count={order.length}
        selectedName={avatarName(selected)}
        onStep={carousel.turn}
      />

      <button
        data-no-drag
        type="button"
        onClick={() => onPick(selected)}
        disabled={busy}
        className={`${pickerButton} mt-10`}
      >
        {busy ? "Joining…" : "Join session"}
      </button>
    </main>
  );
}
