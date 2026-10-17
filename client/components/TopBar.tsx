import { HandIcon } from "@/components/Icons";
import { button } from "@/components/button";
import { HelpityLogo } from "@/components/HelpityLogo";

type TopBarProps = {
  code: string;
  isTeacher: boolean;
  raisedHand: boolean;
  /** Undefined until the session is connected. */
  onToggleHand?: () => void;
};

/** Session navbar: logo, the join code to share, and the student's raise-hand button. */
export function TopBar({ code, isTeacher, raisedHand, onToggleHand }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-wood px-3 py-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-4">
      <span className="hidden min-[420px]:inline-flex"><HelpityLogo /></span>
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
            <HandIcon /> {raisedHand ? "Lower hand" : "Raise hand"}
          </button>
        )}
      </div>
    </header>
  );
}
