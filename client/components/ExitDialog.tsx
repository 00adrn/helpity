"use client";

import { useEffect, useRef, useState } from "react";

import { button } from "@/components/button";

type ExitDialogProps = {
  open: boolean;
  isTeacher: boolean;
  onClose(): void;
  /** Ends (teacher) or leaves (student) the session, then goes home. */
  onConfirm(): void | Promise<void>;
};

const COPY = {
  teacher: {
    title: "End this session?",
    body: "Everyone will go back to the home page, and the join code will stop working.",
    stay: "Keep teaching",
    confirm: "End session",
    busy: "Ending…",
  },
  student: {
    title: "Leave this session?",
    body: "You can come back any time with the join code.",
    stay: "Stay",
    confirm: "Leave session",
    busy: "Leaving…",
  },
} as const;

/** "Are you sure?" before ending or leaving a session. A native modal, so Escape and focus just work. */
export function ExitDialog({ open, isTeacher, onClose, onConfirm }: ExitDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const copy = COPY[isTeacher ? "teacher" : "student"];

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  async function confirm() {
    setBusy(true);
    await onConfirm();
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // Clicking the dimmed backdrop (the dialog element itself) closes it.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-labelledby="exit-title"
      className="m-auto w-[min(360px,calc(100vw-32px))] rounded-xl border border-border bg-surface p-0 text-fg shadow-sm backdrop:bg-fg/30"
    >
      <div className="flex flex-col gap-2 px-5 pt-5 pb-4">
        <h2 id="exit-title" className="text-xl font-bold">
          {copy.title}
        </h2>
        <p className="text-sm text-muted">{copy.body}</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <button type="button" autoFocus onClick={onClose} disabled={busy} className={button.secondary}>
          {copy.stay}
        </button>
        <button type="button" onClick={confirm} disabled={busy} className={button.danger}>
          {busy ? copy.busy : copy.confirm}
        </button>
      </div>
    </dialog>
  );
}
