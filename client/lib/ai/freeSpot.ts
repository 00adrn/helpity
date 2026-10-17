import type { editor as MonacoNs } from "monaco-editor";

type MonacoEditor = MonacoNs.IStandaloneCodeEditor;

export type Point = { x: number; y: number };

/** Clear space kept between the end of a line of code and the assistant, in px. */
const GAP = 10;
/** How many lines above and below the preferred spot to try. */
const SEARCH_LINES = 12;
/** Moving vertically costs more than moving right, so it stays near the cursor's row. */
const VERTICAL_COST = 2;
const DEFAULT_LINE_HEIGHT = 22;

/**
 * Finds spots where a `size`-px square doesn't cover code. Code only fills the left part of each
 * line, so a spot is free when it sits right of the end of every line it overlaps. Returns a
 * function mapping a preferred screen position to the closest free one, or the preferred position
 * itself when nowhere is free (like a file of very long lines).
 */
export function createFreeSpotFinder(editor: MonacoEditor, size: number) {
  let lineHeight = DEFAULT_LINE_HEIGHT;
  let cachedVersion = -1;
  // End of each line's text, in px from the start of the line. Valid for one model version.
  const lineEnds = new Map<number, number | null>();

  /** Where the text on `line` ends, relative to the editor's left edge; null if it is blank. */
  function lineEnd(line: number): number | null {
    const model = editor.getModel();
    if (!model) return null;

    if (model.getVersionId() !== cachedVersion) {
      cachedVersion = model.getVersionId();
      lineEnds.clear();
    }

    let offset = lineEnds.get(line);
    if (offset === undefined) {
      const lastText = model.getLineLastNonWhitespaceColumn(line);
      offset = lastText === 0 ? null : editor.getOffsetForColumn(line, lastText + 1);
      lineEnds.set(line, offset);
    }
    if (offset === null) return null;

    return offset + editor.getLayoutInfo().contentLeft - editor.getScrollLeft();
  }

  /** The furthest right any code reaches among lines overlapping [top, top + size]. */
  function codeRightEdge(rect: DOMRect, top: number, firstLine: number, lastLine: number) {
    const scrollTop = editor.getScrollTop();
    let edge = -Infinity;

    for (let line = firstLine; line <= lastLine; line++) {
      const lineTop = rect.top + editor.getTopForLineNumber(line) - scrollTop;
      if (lineTop >= top + size) break;
      if (lineTop + lineHeight <= top) continue;

      const end = lineEnd(line);
      if (end !== null) edge = Math.max(edge, rect.left + end);
    }
    return edge;
  }

  return function findFreeSpot(rect: DOMRect, preferred: Point): Point {
    const range = editor.getVisibleRanges()[0];
    if (!range) return preferred;

    const position = editor.getPosition();
    const measured = position && editor.getScrolledVisiblePosition(position)?.height;
    if (measured) lineHeight = measured;

    const maxX = rect.right - size;
    let best: Point | undefined;
    let bestCost = Infinity;

    for (let i = 0; i <= SEARCH_LINES * 2; i++) {
      // 0, +1, -1, +2, -2, ...
      const lines = i % 2 === 1 ? (i + 1) / 2 : -i / 2;
      const y = Math.min(Math.max(preferred.y + lines * lineHeight, rect.top), rect.bottom - size);
      const edge = codeRightEdge(rect, y, range.startLineNumber, range.endLineNumber);
      const x = Math.max(preferred.x, edge + GAP);
      if (x > maxX) continue;

      const cost = x - preferred.x + Math.abs(y - preferred.y) * VERTICAL_COST;
      if (cost === 0) return preferred;
      if (cost < bestCost) {
        best = { x, y };
        bestCost = cost;
      }
    }

    return best ?? preferred;
  };
}
