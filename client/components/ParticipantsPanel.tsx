"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore, type KeyboardEvent } from "react";

import { Avatar } from "@/components/Avatar";
import type { ParticipantPresence, SessionConnection } from "@/lib/sockets/sock";

type Awareness = SessionConnection["awareness"];

const NOBODY: ParticipantPresence[] = [];

/** Everyone currently connected to the room: teacher first, then raised hands, then by name. */
function readParticipants(awareness: Awareness): ParticipantPresence[] {
  const byId = new Map<string, ParticipantPresence>();

  for (const state of awareness.getStates().values()) {
    const participant = (state as { participant?: ParticipantPresence }).participant;
    if (participant) byId.set(participant.id, participant);
  }

  return [...byId.values()].sort(
    (a, b) =>
      Number(b.role === "teacher") - Number(a.role === "teacher") ||
      Number(b.raisedHand) - Number(a.raisedHand) ||
      a.name.localeCompare(b.name),
  );
}

/** Live list of everyone in the session, read from Yjs awareness. */
export function useParticipants(awareness: Awareness | undefined): ParticipantPresence[] {
  // The snapshot must keep its identity until awareness changes, so cache it.
  const store = useMemo(() => {
    if (!awareness) return undefined;

    let snapshot = readParticipants(awareness);

    return {
      subscribe(onChange: () => void) {
        const handleChange = () => {
          snapshot = readParticipants(awareness);
          onChange();
        };
        awareness.on("change", handleChange);
        return () => awareness.off("change", handleChange);
      },
      getSnapshot: () => snapshot,
    };
  }, [awareness]);

  return useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => NOBODY),
    () => NOBODY,
  );
}

type ParticipantsPanelProps = {
  participants: ParticipantPresence[];
  selfId: string;
  isTeacher: boolean;
  /** The one student allowed to type in the shared editor, if any. */
  writerId: string | null;
  onGrant(studentId: string): void;
  onRevoke(): void;
  /** Sidebar width in px on wide screens; undefined on narrow ones, where it becomes a top strip. */
  width?: number;
  onResize?(width: number): void;
};

const MIN_WIDTH = 176;
const MAX_WIDTH = 480;

/** Drag handle on the sidebar's right edge. */
function SidebarHandle({ width, onResize }: { width: number; onResize: (width: number) => void }) {
  const [dragging, setDragging] = useState(false);
  const set = (next: number) => onResize(Math.min(Math.max(next, MIN_WIDTH), MAX_WIDTH));

  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    set(width + (event.key === "ArrowRight" ? 16 : -16));
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      tabIndex={0}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        if (!dragging) return;
        const left = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
        set(event.clientX - left);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={key}
      className={`absolute inset-y-0 right-0 z-20 w-1.5 cursor-col-resize touch-none outline-none transition hover:bg-accent focus-visible:bg-accent ${
        dragging ? "bg-accent" : ""
      }`}
    />
  );
}

/** Left sidebar: everyone connected, raised hands, and (for teachers) who may type. */
export function ParticipantsPanel({
  participants,
  selfId,
  isTeacher,
  writerId,
  onGrant,
  onRevoke,
  width,
  onResize,
}: ParticipantsPanelProps) {
  const students = participants.filter((person) => person.role === "student").length;

  return (
    <aside
      style={width === undefined ? undefined : { width }}
      className="relative flex max-h-40 shrink-0 flex-col overflow-hidden border-b border-border bg-wood md:max-h-none md:border-r md:border-b-0"
    >
      {width !== undefined && onResize && <SidebarHandle width={width} onResize={onResize} />}
      <div className="relative z-10 flex flex-col gap-0.5 border-b border-border px-4 py-3">
        <h2 className="flex items-baseline gap-3">
          <span className="text-xl font-bold text-fg">{isTeacher ? "Participants" : "Here now"}</span>
          <span className="text-sm text-muted">
            ({students} {students === 1 ? "student" : "students"})
          </span>
        </h2>
        {isTeacher && (
          <p className="text-xs text-muted">Click a student to let them type.</p>
        )}
      </div>

      {/*
        On large screens (where the tree shows) the list fades out just above the tree's leaves,
        and the bottom padding lets the last student scroll up into full view.
      */}
      <ul className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto p-2 lg:pb-[190px] lg:[mask-image:linear-gradient(to_bottom,black_calc(100%_-_190px),transparent_calc(100%_-_120px))]">
        {participants.map((person) => {
          const isWriter = person.id === writerId;
          const canGrant = isTeacher && person.role === "student" && !isWriter;
          const suffix = `${person.id === selfId ? " (you)" : ""}${person.role === "teacher" ? " · teacher" : ""}`;
          const row = (
            <>
              <Avatar id={person.avatar} size={32} color={person.color} />
              <span className="min-w-0 flex-1 truncate">
                <span className="text-fg">{person.name}</span>
                {suffix && <span className="text-muted">{suffix}</span>}
              </span>
              {person.raisedHand && (
                <span role="img" aria-label="Hand raised" title="Hand raised">
                  ✋
                </span>
              )}
            </>
          );
          const rowClass = `flex h-14 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
            isWriter ? "bg-accent-subtle" : ""
          }`;

          return (
            <li key={person.id}>
              {canGrant ? (
                <button
                  type="button"
                  onClick={() => onGrant(person.id)}
                  title={`Let ${person.name} type in the class code`}
                  className={`${rowClass} cursor-pointer transition hover:bg-accent-subtle/50 focus-visible:outline-2 focus-visible:outline-accent`}
                >
                  {row}
                </button>
              ) : (
                <div className={rowClass}>
                  {row}
                  {isWriter && isTeacher && (
                    <button
                      type="button"
                      onClick={onRevoke}
                      className="shrink-0 rounded bg-red-50 px-1.5 text-xs leading-[18px] font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Revoke writing
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {participants.length === 0 && <li className="px-2 py-1.5 text-sm text-muted">Connecting…</li>}
      </ul>

      {/*
        The tree, centered and lowered 10px so its grass tucks under the sidebar's bottom edge, with
        the SwampHacks XII badge in the empty space under its branches on the right.
      */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 size-[156px] -translate-x-1/2 translate-y-2.5 max-lg:hidden">
        <Image
          src="/tree.png"
          alt=""
          // Not on an exact pixel grid, so it's scaled smoothly (the 260px file stays sharp here).
          width={156}
          height={156}
          unoptimized
          className="max-w-none"
        />
        <Image
          src="/swamphacks.png"
          alt="SwampHacks XII"
          // About 1.2px per art pixel (27×27).
          width={32}
          height={32}
          unoptimized
          className="absolute right-2.5 bottom-3.5 max-w-none [image-rendering:pixelated]"
        />
      </div>
    </aside>
  );
}
