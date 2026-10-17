"use client";

import { useMemo, useSyncExternalStore } from "react";

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

function useParticipants(awareness: Awareness | undefined): ParticipantPresence[] {
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

/** Side panel listing everyone connected to the session. */
export function ParticipantsPanel({
  awareness,
  selfId,
}: {
  awareness: Awareness | undefined;
  selfId: string;
}) {
  const participants = useParticipants(awareness);

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-3 border-l border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="font-medium">Connected ({participants.length})</h2>
      <ul className="flex flex-col gap-2">
        {participants.map((person) => (
          <li key={person.id} className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: person.color }}
            />
            <span className="truncate">
              {person.name}
              {person.id === selfId && " (you)"}
            </span>
            {person.role === "teacher" && (
              <span className="rounded bg-zinc-200 px-1.5 text-xs dark:bg-zinc-800">
                teacher
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
