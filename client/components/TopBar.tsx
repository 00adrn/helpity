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
    <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-wood px-4 py-2">
      <HelpityLogo />
      <p className="flex items-baseline gap-1 font-semibold text-fg">
        <span className="text-sm">Join Code:</span>
        <span className="text-2xl font-bold tracking-[2.4px]">{code}</span>
      </p>
      <div className="flex justify-end gap-2">
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
      </div>
    </header>
  );
}
