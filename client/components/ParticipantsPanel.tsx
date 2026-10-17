"use client";

import Image from "next/image";
import { useMemo, useSyncExternalStore } from "react";

import { Avatar } from "@/components/Avatar";
import type { ParticipantPresence, SessionConnection } from "@/lib/sockets/sock";

type Awareness = SessionConnection["awareness"];

const NOBODY: ParticipantPresence[] = [];

/** Everyone currently connected to the room, teacher first, then by name. */
function readParticipants(awareness: Awareness): ParticipantPresence[] {
  const byId = new Map<string, ParticipantPresence>();

  for (const state of awareness.getStates().values()) {
    const participant = (state as { participant?: ParticipantPresence }).participant;
    if (participant) byId.set(participant.id, participant);
  }

  return [...byId.values()].sort(
    (a, b) =>
      Number(b.role === "teacher") - Number(a.role === "teacher") ||
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
};

/** Left sidebar: everyone connected, raised hands, and (for teachers) who may type. */
export function ParticipantsPanel({
  participants,
  selfId,
  isTeacher,
  writerId,
  onGrant,
  onRevoke,
}: ParticipantsPanelProps) {
  const students = participants.filter((person) => person.role === "student").length;

  return (
    <aside className="relative flex w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-wood">
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

      <ul className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
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

      <Image
        src="/sapling.png"
        alt=""
        width={360}
        height={360}
        className="pointer-events-none absolute -bottom-[104px] -left-16 size-[360px] max-w-none [image-rendering:pixelated]"
      />
    </aside>
  );
}
