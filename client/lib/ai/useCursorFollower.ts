import { useEffect, useRef, type RefObject } from "react";

import type { editor as MonacoNs } from "monaco-editor";

import { createFreeSpotFinder } from "./freeSpot";

type MonacoEditor = MonacoNs.IStandaloneCodeEditor;

/** Gap between the text cursor and the assistant, in px. */
const OFFSET = { x: 18, y: 6 };
/** Gap between the assistant and the editor's corner while it is parked, in px. */
const HOME_MARGIN = 16;
/** Fraction of the remaining distance covered each frame (higher = snappier). */
const EASE = 0.16;
const MAX_LEAN_DEG = 14;
/** Squash-and-stretch while moving: stretch per px of distance left to travel, and its cap. */
const STRETCH_PER_PX = 0.0012;
const MAX_STRETCH = 0.18;
/** Space a panel below the assistant needs before it flips above instead. */
const PANEL_ROOM = 260;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Moves `ref`'s element (position: fixed, top/left 0) to trail the editor's text cursor, or
 * parks it in the editor's bottom-right corner while `follow` is false. Either way it slides to
 * the nearest spot that doesn't cover code (see freeSpot.ts).
 * Each frame it reads the cursor's screen position, so scrolling, layout changes and window
 * resizes need no event handling. The element is eased toward the target and gets a `--lean`
 * CSS variable (degrees) from its horizontal velocity and a `--stretch` variable from its speed. When the cursor is scrolled out of
 * view, the element is clamped to the editor's edge. It also keeps `data-side` ("left" when
 * the assistant is on the right half of the screen) and `data-vert` ("up" when it is near the
 * bottom) up to date so anything attached to it can open toward free space.
 */
export function useCursorFollower(
  editor: MonacoEditor | undefined,
  ref: RefObject<HTMLElement | null>,
  size: number,
  follow: boolean,
) {
  const followRef = useRef(follow);
  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  // Survives a change of editor, so Helpity glides to the new window instead of snapping.
  const motion = useRef({ x: 0, y: 0, placed: false });

  useEffect(() => {
    const el = ref.current;
    if (!editor || !el) return;

    const findFreeSpot = createFreeSpotFinder(editor, size);
    const cur = motion.current;
    let frame = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);

      const node = editor.getDomNode();
      if (!node) return;
      const rect = node.getBoundingClientRect();

      let targetX = rect.right - size - HOME_MARGIN;
      let targetY = rect.bottom - size - HOME_MARGIN;

      if (followRef.current) {
        const position = editor.getPosition();
        const visible = position && editor.getScrolledVisiblePosition(position);
        if (!visible) return;

        targetX = clamp(rect.left + visible.left + OFFSET.x, rect.left, rect.right - size);
        targetY = clamp(
          rect.top + visible.top + visible.height + OFFSET.y,
          rect.top,
          rect.bottom - size,
        );
      }

      const target = findFreeSpot(rect, { x: targetX, y: targetY });

      if (!cur.placed) {
        cur.x = target.x;
        cur.y = target.y;
        cur.placed = true;
      }

      const dx = target.x - cur.x;
      const dy = target.y - cur.y;
      cur.x += dx * EASE;
      cur.y += dy * EASE;

      el.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
      el.style.setProperty("--lean", `${clamp(dx * 0.25, -MAX_LEAN_DEG, MAX_LEAN_DEG)}deg`);
      // Stretches while it travels, then settles back to round.
      const stretch = clamp(Math.hypot(dx, dy) * STRETCH_PER_PX, 0, MAX_STRETCH);
      el.style.setProperty("--stretch", stretch.toFixed(3));

      // Tell attached UI (like the speech bubble) which way has room.
      const side = cur.x > window.innerWidth / 2 ? "left" : "right";
      const vert = cur.y > window.innerHeight - PANEL_ROOM ? "up" : "down";
      if (el.dataset.side !== side) el.dataset.side = side;
      if (el.dataset.vert !== vert) el.dataset.vert = vert;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [editor, ref, size]);
}
