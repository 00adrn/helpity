"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { button } from "@/components/button";
import { CodeSizeSegments, CodeSizeSelect } from "@/components/CodeSizeSelect";
import { ExitDialog } from "@/components/ExitDialog";
import { CheckIcon, CopyIcon, MoreIcon, UsersIcon } from "@/components/Icons";
import { HelpityLogo } from "@/components/HelpityLogo";
import { Sheet } from "@/components/Sheet";
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
  /** Phones only: who's here, for the button that opens the participants sheet. */
  people?: { students: number; hands: number; onOpen(): void };
};

// Phone navbar buttons: at least 44px square, so they're easy to tap.
const phoneButton =
  "relative inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";
const phoneSheetButton =
  "h-12 w-full rounded-xl border text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50";

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

/**
 * Session navbar: logo, the join code, raise hand or switch lesson, code size, and end/leave session.
 * On phones (under md) the logo goes, and the controls become big icon buttons plus an Options sheet.
 */
export function TopBar({ code, isTeacher, raisedHand, onToggleHand, onExit, onSwitchLesson, people }: TopBarProps) {
  const [confirming, setConfirming] = useState(false);
  const [options, setOptions] = useState(false);

  return (
    // Narrowing the window drops things in order: the wordmark (below lg), then the full buttons,
    // which become phone controls (below md). Nothing is ever allowed to wrap onto two lines.
    <header className="flex items-center justify-between gap-2 border-b border-border bg-wood px-3 py-2 md:gap-3 md:px-4 lg:grid lg:grid-cols-[1fr_auto_1fr]">
      {/* The wordmark goes home too, so it asks the same question as End/Leave session. */}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={!onExit}
        aria-label={isTeacher ? "Helpity home (ends the session)" : "Helpity home (leaves the session)"}
        className="hidden justify-self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default lg:inline-flex"
      >
        <HelpityLogo />
      </button>
      <div className="flex min-w-0 shrink-0 items-center gap-1 md:gap-2">
        <p className="flex items-baseline gap-1 font-semibold whitespace-nowrap text-fg">
          <span className="hidden text-sm md:inline">Join Code:</span>
          <span className="text-xl font-bold tracking-[2px] md:text-2xl md:tracking-[2.4px]">{code}</span>
        </p>
        <CopyJoinLink code={code} />
      </div>
      <div className="hidden shrink-0 justify-end gap-2 whitespace-nowrap md:flex">
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

      {/* Phones: who's here, raise hand, and everything else under ⋯ */}
      <div className="flex shrink-0 items-center gap-1.5 md:hidden">
        {people && (
          <button
            type="button"
            onClick={people.onOpen}
            aria-label={`Participants: ${people.students} ${people.students === 1 ? "student" : "students"}${
              isTeacher && people.hands ? `, ${people.hands} with a hand raised` : ""
            }`}
            className={`${phoneButton} border-border bg-surface text-fg`}
          >
            <UsersIcon />
            <span className="text-sm">{people.students}</span>
            {/* Only the teacher needs to know how many hands are up. */}
            {isTeacher && people.hands > 0 && (
              <span className="absolute -top-2 -right-2 rounded-full bg-helpity px-1.5 text-xs leading-5 font-bold text-fg shadow-sm">
                ✋{people.hands}
              </span>
            )}
          </button>
        )}
        {!isTeacher && (
          <button
            type="button"
            onClick={onToggleHand}
            disabled={!onToggleHand}
            aria-pressed={raisedHand}
            aria-label={raisedHand ? "Lower hand" : "Raise hand"}
            className={`${phoneButton} ${
              raisedHand ? "border-transparent bg-accent text-on-accent shadow-sm" : "border-border bg-surface"
            }`}
          >
            ✋
          </button>
        )}
        <button
          type="button"
          onClick={() => setOptions(true)}
          aria-label="More options"
          className={`${phoneButton} border-border bg-surface text-fg`}
        >
          <MoreIcon />
        </button>
      </div>
      <Sheet open={options} onClose={() => setOptions(false)} title="Options">
        <div className="flex flex-col gap-3 px-5 pb-4">
          <CodeSizeSegments />
          {isTeacher && (
            <button
              type="button"
              disabled={!onSwitchLesson}
              onClick={() => {
                setOptions(false);
                onSwitchLesson?.();
              }}
              className={`${phoneSheetButton} mt-2 border-border bg-surface text-fg`}
            >
              Switch lesson
            </button>
          )}
          <button
            type="button"
            disabled={!onExit}
            onClick={() => {
              setOptions(false);
              setConfirming(true);
            }}
            className={`${phoneSheetButton} border-red-200 bg-surface text-red-600 ${isTeacher ? "" : "mt-2"}`}
          >
            {isTeacher ? "End session" : "Leave session"}
          </button>
        </div>
      </Sheet>

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
