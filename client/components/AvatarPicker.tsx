"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar, avatarName, shuffledAvatars, type AvatarId } from "@/components/Avatar";

// The avatars sit on the rim of a wheel whose pivot is below the selected one.
// Each item's transform is `rotate(a) translateY(-R) rotate(-a)`: CSS interpolates the two
// rotations, so changing `a` swings the item along the arc while it stays upright.
const STEP_DEG = 40;
const VISIBLE = 2; // neighbours shown on each side; the next one fades in while scrolling
const SCALES = [1, 0.92, 0.8, 0.7]; // by distance from the selected avatar (Figma: 250/230/200)
const DRAG_PX_PER_AVATAR = 220; // how far a drag or side-scroll moves the wheel by one avatar
const DRAG_THRESHOLD_PX = 6; // smaller movements still count as a click
const WHEEL_IDLE_MS = 150; // snap once scrolling (including trackpad momentum) stops

/** Signed, fractional distance from the selected slot, wrapped so the wheel loops: -n/2 … n/2. */
function offsetFrom(index: number, position: number, count: number) {
  const d = (((index - position) % count) + count) % count;
  return d > count / 2 ? d - count : d;
}

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
  // Unbounded and fractional while dragging; whole numbers once snapped.
  const [position, setPosition] = useState(0);
  // While the user is dragging or scrolling, items follow the input with no transition.
  const [scrubbing, setScrubbing] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; travelled: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);

  const count = order.length;
  const nearest = Math.round(position);
  const selectedIndex = ((nearest % count) + count) % count;
  const selected = order[selectedIndex];

  const turn = (by: number) => setPosition((p) => Math.round(p) + by);
  const snap = useCallback(() => {
    setScrubbing(false);
    setPosition((p) => Math.round(p));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") setPosition((p) => Math.round(p) - 1);
      else if (event.key === "ArrowRight") setPosition((p) => Math.round(p) + 1);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Trackpad side-scroll and mouse wheel turn the wheel freely, then snap when they stop.
  // Registered by hand because React's onWheel is passive and can't preventDefault.
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    let idle: number | undefined;

    function onWheel(event: WheelEvent) {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault(); // also stops the browser's swipe-to-go-back
      const px = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? delta * 16 : delta;
      setScrubbing(true);
      setPosition((p) => p + px / DRAG_PX_PER_AVATAR);
      window.clearTimeout(idle);
      idle = window.setTimeout(snap, WHEEL_IDLE_MS);
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      window.clearTimeout(idle);
    };
  }, [snap]);

  return (
    <main
      ref={stage}
      className="relative flex flex-1 touch-pan-y flex-col items-center overflow-hidden overscroll-x-none bg-bg px-4 pt-[min(128px,20vh)] select-none [--avatar:min(200px,26vw)] [--wheel-r:min(512px,38vw)]"
      onPointerDown={(event) => {
        suppressClick.current = false;
        if ((event.target as Element).closest("[data-no-drag]")) return;
        drag.current = { x: event.clientX, travelled: 0, active: false };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current) return;
        const dx = event.clientX - current.x;
        current.x = event.clientX;
        current.travelled += Math.abs(dx);
        if (!current.active) {
          if (current.travelled < DRAG_THRESHOLD_PX) return;
          current.active = true;
          setScrubbing(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        // Dragging right pulls the avatars right, bringing earlier ones into the middle.
        setPosition((p) => p - dx / DRAG_PX_PER_AVATAR);
      }}
      onPointerUp={() => {
        if (drag.current?.active) {
          suppressClick.current = true;
          snap();
        }
        drag.current = null;
      }}
      onPointerCancel={() => {
        if (drag.current?.active) snap();
        drag.current = null;
      }}
    >
      <h1 className="text-4xl leading-none font-bold tracking-[-0.9px] text-fg">
        Select your avatar
      </h1>

      {/* The selected avatar's slot; the wheel's pivot hangs below its center. */}
      <div className="relative mt-12 size-(--avatar) shrink-0">
        <div className="absolute top-[calc(50%+var(--wheel-r))] left-1/2">
          {order.map((id, index) => {
            const offset = offsetFrom(index, position, count);
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
                onClick={() => {
                  if (suppressClick.current || isCenter) return;
                  turn(Math.round(offset));
                }}
                className={`absolute -top-[calc(var(--avatar)/2)] -left-[calc(var(--avatar)/2)] size-(--avatar) cursor-pointer rounded-full ${
                  scrubbing
                    ? "transition-none"
                    : "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                }`}
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

      <div data-no-drag className="relative z-[200] mt-24 flex w-[264px] max-w-full items-center justify-between">
        <button
          type="button"
          onClick={() => turn(-1)}
          aria-label="Previous avatar"
          className="rounded-full transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Image src="/chevron-left.svg" alt="" width={56} height={56} />
        </button>
        <p aria-live="polite" className="text-4xl leading-none font-bold tracking-[-0.9px] text-fg tabular-nums">
          {selectedIndex + 1}/{count}
          <span className="sr-only">, {avatarName(selected)}</span>
        </p>
        <button
          type="button"
          onClick={() => turn(1)}
          aria-label="Next avatar"
          className="rounded-full transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Image src="/chevron-right.svg" alt="" width={56} height={56} />
        </button>
      </div>

      <button
        data-no-drag
        type="button"
        onClick={() => onPick(selected)}
        disabled={busy}
        className="relative z-[200] mt-10 rounded-2xl bg-accent px-5 py-2.5 text-[22px] leading-8 font-semibold text-on-accent shadow-[0_2px_2px_rgba(0,0,0,0.1),0_2px_3px_rgba(0,0,0,0.1)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join session"}
      </button>
    </main>
  );
}
