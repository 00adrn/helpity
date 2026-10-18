"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { button } from "@/components/button";
import { CodeSizeSelect } from "@/components/CodeSizeSelect";
import { ExitDialog } from "@/components/ExitDialog";
import { CheckIcon, CopyIcon } from "@/components/Icons";
import { HelpityLogo } from "@/components/HelpityLogo";
import { pop } from "@/lib/motion";

type TopBarProps = {
  code: string;
  isTeacher: boolean;
  raisedHand: boolean;
  /** Undefined until the session is connected. */
  onToggleHand?: () => void;
  /** End the session (teacher) or leave it (student), then go home. Undefined until connected. */
  onExit?: () => void | Promise<void>;
  /** Teacher only: open the lesson select screen. Undefined until connected. */
  onSwitchLesson?: () => void;
};

/** Copies the /join/CODE link, so the class can open it instead of typing the code. */
function CopyJoinLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1000);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked; the code is still on screen to read out.
    }
  }

  return (
    <div className="relative flex">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy join link"
        title="Copy join link"
        // leading-none keeps it 30px tall, inside the navbar's 34px button row.
        className="grid rounded-md p-1.5 text-lg leading-none text-muted transition hover:bg-surface-sunken hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        {/* The copy and check icons cross-fade in the same spot. */}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={copied ? "check" : "copy"}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            className="col-start-1 row-start-1"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </motion.span>
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {copied && (
          <motion.span
            {...pop}
            role="status"
            className="absolute top-full left-1/2 z-30 mt-1 -translate-x-1/2 rounded-md bg-fg px-2 py-1 text-xs font-semibold whitespace-nowrap text-on-accent shadow-sm"
          >
            Copied link!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Session navbar: logo, the join code, raise hand or switch lesson, code size, and end/leave session. */
export function TopBar({ code, isTeacher, raisedHand, onToggleHand, onExit, onSwitchLesson }: TopBarProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-wood px-3 py-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-4">
      {/* The wordmark goes home too, so it asks the same question as End/Leave session. */}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={!onExit}
        aria-label={isTeacher ? "Helpity home (ends the session)" : "Helpity home (leaves the session)"}
        className="hidden justify-self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default min-[420px]:inline-flex"
      >
        <HelpityLogo />
      </button>
      <div className="flex items-center gap-2">
        <p className="flex items-baseline gap-1 font-semibold text-fg">
          <span className="hidden text-sm sm:inline">Join Code:</span>
          <span className="text-2xl font-bold tracking-[2.4px]">{code}</span>
        </p>
        <CopyJoinLink code={code} />
      </div>
      <div className="flex min-w-0 justify-end gap-2">
        {!isTeacher && (
          <button
            type="button"
            onClick={onToggleHand}
            disabled={!onToggleHand}
            aria-pressed={raisedHand}
            className={raisedHand ? button.primary : button.secondary}
          >
            {raisedHand ? "✋ Lower hand" : "✋ Raise hand"}
          </button>
        )}
        {isTeacher && (
          <button type="button" onClick={onSwitchLesson} disabled={!onSwitchLesson} className={button.secondary}>
            Switch lesson
          </button>
        )}
        <CodeSizeSelect />
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!onExit}
          className={button.danger}
        >
          {isTeacher ? "End session" : "Leave session"}
        </button>
      </div>
      {onExit && (
        <ExitDialog
          open={confirming}
          isTeacher={isTeacher}
          onClose={() => setConfirming(false)}
          onConfirm={onExit}
        />
      )}
    </header>
  );
}
