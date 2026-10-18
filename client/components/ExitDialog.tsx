"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { button } from "@/components/button";
import { fade, pop } from "@/lib/motion";

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

/**
 * "Are you sure?" before ending or leaving a session, opened from End/Leave session or the
 * wordmark. A native modal (so Escape and focus just work) whose backdrop and panel animate
 * with the app's motion presets; it only really closes once the exit animation has played.
 */
export function ExitDialog({ open, isTeacher, onClose, onConfirm }: ExitDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const copy = COPY[isTeacher ? "teacher" : "student"];

  useEffect(() => {
    const node = dialog.current;
    if (open && node && !node.open) node.showModal();
  }, [open]);

  async function confirm() {
    setBusy(true);
    await onConfirm();
  }

  return (
    <dialog
      ref={dialog}
      // Escape: animate out instead of the browser closing it at once.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="exit-title"
      className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-4 backdrop:bg-transparent open:grid open:place-items-center"
    >
      <AnimatePresence onExitComplete={() => dialog.current?.close()}>
        {open && (
          <>
            <motion.div key="backdrop" {...fade} onClick={onClose} className="fixed inset-0 bg-fg/30" />
            <motion.div
              key="panel"
              {...pop}
              className="relative w-[min(360px,100%)] rounded-xl border border-border bg-surface text-fg shadow-sm"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </dialog>
  );
}
