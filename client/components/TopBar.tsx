"use client";

import { useState } from "react";

import { button } from "@/components/button";
import { CodeSizeSelect } from "@/components/CodeSizeSelect";
import { ExitDialog } from "@/components/ExitDialog";
import { HelpityLogo } from "@/components/HelpityLogo";

type TopBarProps = {
  code: string;
  isTeacher: boolean;
  raisedHand: boolean;
  /** Undefined until the session is connected. */
  onToggleHand?: () => void;
  /** End the session (teacher) or leave it (student), then go home. Undefined until connected. */
  onExit?: () => void | Promise<void>;
};

/** Session navbar: logo, the join code to share, raise hand, code size, and end/leave session. */
export function TopBar({ code, isTeacher, raisedHand, onToggleHand, onExit }: TopBarProps) {
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
      <p className="flex items-baseline gap-1 font-semibold text-fg">
        <span className="hidden text-sm sm:inline">Join Code:</span>
        <span className="text-2xl font-bold tracking-[2.4px]">{code}</span>
      </p>
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
