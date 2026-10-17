"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 6; // smaller movements still count as a click
const WHEEL_IDLE_MS = 150; // snap once scrolling (including trackpad momentum) stops

/**
 * Shared behavior for the looping pickers (avatars, problems): drag, trackpad side-scroll and
 * mouse wheel move it freely and snap to the nearest item on release; arrow keys, the chevron
 * buttons and clicking a neighbour step one item at a time.
 *
 * Spread `stageProps` on the element that should accept drags and scrolling. Children marked
 * `data-no-drag` (buttons, menus) never start a drag.
 */
export function useCarousel(count: number, { pxPerItem }: { pxPerItem: number }) {
  // Unbounded and fractional while dragging; whole numbers once snapped.
  const [position, setPosition] = useState(0);
  // While the user is dragging or scrolling, items follow the input with no transition.
  const [scrubbing, setScrubbing] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; travelled: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);

  const nearest = Math.round(position);
  const selectedIndex = count ? ((nearest % count) + count) % count : 0;

  const turn = useCallback((by: number) => setPosition((p) => Math.round(p) + by), []);
  const snap = useCallback(() => {
    setScrubbing(false);
    setPosition((p) => Math.round(p));
  }, []);
  const reset = useCallback(() => setPosition(0), []);

  /** Signed, fractional distance of an item from the selected slot, wrapped so it loops: -n/2 … n/2. */
  const offsetOf = (index: number) => {
    if (!count) return 0;
    const d = (((index - position) % count) + count) % count;
    return d > count / 2 ? d - count : d;
  };

  /** Click handler for an item: steps to it, unless the click was the end of a drag. */
  const clickItem = (offset: number) => {
    if (suppressClick.current || Math.round(offset) === 0) return;
    turn(Math.round(offset));
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") turn(-1);
      else if (event.key === "ArrowRight") turn(1);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [turn]);

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
      setPosition((p) => p + px / pxPerItem);
      window.clearTimeout(idle);
      idle = window.setTimeout(snap, WHEEL_IDLE_MS);
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      window.clearTimeout(idle);
    };
  }, [snap, pxPerItem]);

  const stageProps = {
    ref: stage,
    onPointerDown(event: React.PointerEvent<HTMLElement>) {
      suppressClick.current = false;
      if ((event.target as Element).closest("[data-no-drag]")) return;
      drag.current = { x: event.clientX, travelled: 0, active: false };
    },
    onPointerMove(event: React.PointerEvent<HTMLElement>) {
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
      // Dragging right pulls the items right, bringing earlier ones into the middle.
      setPosition((p) => p - dx / pxPerItem);
    },
    onPointerUp() {
      if (drag.current?.active) {
        suppressClick.current = true;
        snap();
      }
      drag.current = null;
    },
    onPointerCancel() {
      if (drag.current?.active) snap();
      drag.current = null;
    },
  };

  /** Transition classes for items: none while following the pointer, eased otherwise. */
  const itemTransition = scrubbing
    ? "transition-none"
    : "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

  return { position, selectedIndex, offsetOf, clickItem, turn, reset, stageProps, itemTransition };
}
