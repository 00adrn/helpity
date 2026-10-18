"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { fade } from "@/lib/motion";

type SheetProps = {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
};

/**
 * A phone-style bottom sheet: slides up over a dimmed backdrop, and closes with a tap outside,
 * Escape, or a swipe down on its handle. It's a native modal underneath, so focus stays inside,
 * and it only really closes once the slide-out has played.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const drag = useDragControls();

  useEffect(() => {
    const node = dialog.current;
    if (!open || !node || node.open) return;
    node.showModal();
    // Start focus on the title, not the first button, so nothing looks pre-selected.
    top.current?.focus();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
      className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-transparent open:flex open:flex-col open:justify-end"
    >
      <AnimatePresence onExitComplete={() => dialog.current?.close()}>
        {open && (
          <>
            <motion.div key="backdrop" {...fade} onClick={onClose} className="fixed inset-0 bg-fg/30" />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 34, stiffness: 380 }}
              // Swipe down on the handle or title to dismiss; the content itself can still scroll.
              drag="y"
              dragListener={false}
              dragControls={drag}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) onClose();
              }}
              className="relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] text-fg shadow-sm"
            >
              <div
                ref={top}
                tabIndex={-1}
                onPointerDown={(event) => drag.start(event)}
                className="shrink-0 cursor-grab touch-none outline-none"
              >
                <div className="flex justify-center pt-2.5 pb-1">
                  <span aria-hidden className="h-1.5 w-10 rounded-full bg-border" />
                </div>
                <h2 className="px-5 pt-1 pb-3 text-lg font-bold">{title}</h2>
              </div>
              <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </dialog>
  );
}
