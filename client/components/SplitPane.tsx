"use client";

import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

type Direction = "horizontal" | "vertical";

const KEY_STEP = 0.02;

/** True while the viewport is at least `px` wide. Server and first client render assume wide. */
export function useMinWidth(px: number): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(`(min-width: ${px}px)`);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(`(min-width: ${px}px)`).matches,
    () => true,
  );
}

/** The draggable divider. It reports the pointer's position as a 0–1 fraction of `container`. */
function Handle({
  direction,
  ratio,
  container,
  onRatio,
}: {
  direction: Direction;
  ratio: number;
  container: React.RefObject<HTMLDivElement | null>;
  onRatio: (ratio: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const horizontal = direction === "horizontal";

  function move(event: PointerEvent<HTMLDivElement>) {
    const rect = container.current?.getBoundingClientRect();
    if (!dragging || !rect) return;
    const size = horizontal ? rect.width : rect.height;
    const offset = horizontal ? event.clientX - rect.left : event.clientY - rect.top;
    onRatio(offset / size);
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    const back = horizontal ? "ArrowLeft" : "ArrowUp";
    const forward = horizontal ? "ArrowRight" : "ArrowDown";
    if (event.key !== back && event.key !== forward) return;
    event.preventDefault();
    onRatio(ratio + (event.key === forward ? KEY_STEP : -KEY_STEP));
  }

  return (
    <div
      role="separator"
      aria-orientation={horizontal ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={move}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={key}
      className={`group relative z-10 flex shrink-0 touch-none items-center justify-center outline-none ${
        horizontal ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize"
      }`}
    >
      <span
        className={`rounded-full transition group-hover:bg-accent group-focus-visible:bg-accent ${
          dragging ? "bg-accent" : "bg-border"
        } ${horizontal ? "h-10 w-1" : "h-1 w-10"}`}
      />
    </div>
  );
}

/**
 * Two panes with a draggable divider between them (like LeetCode's split view).
 * `minA`/`minB` are the smallest sizes in px each pane may be dragged to.
 */
export function SplitPane({
  direction,
  a,
  b,
  initial = 0.5,
  minA = 160,
  minB = 160,
  className = "",
}: {
  direction: Direction;
  a: ReactNode;
  b: ReactNode;
  initial?: number;
  minA?: number;
  minB?: number;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(initial);
  const horizontal = direction === "horizontal";

  function clamp(next: number) {
    const rect = container.current?.getBoundingClientRect();
    const size = rect ? (horizontal ? rect.width : rect.height) : 0;
    if (size <= minA + minB) return Math.min(Math.max(next, 0.2), 0.8);
    return Math.min(Math.max(next, minA / size), 1 - minB / size);
  }

  return (
    <div ref={container} className={`flex min-h-0 min-w-0 ${horizontal ? "flex-row" : "flex-col"} ${className}`}>
      <div
        style={{ flex: `${ratio} 1 0%` }}
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      >
        {a}
      </div>
      <Handle
        direction={direction}
        ratio={ratio}
        container={container}
        onRatio={(next) => setRatio(clamp(next))}
      />
      <div
        style={{ flex: `${1 - ratio} 1 0%` }}
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      >
        {b}
      </div>
    </div>
  );
}
