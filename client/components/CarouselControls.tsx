import Image from "next/image";

/** The big call-to-action under a picker (Figma: Join session / Create session). */
export const pickerButton =
  "relative z-[200] rounded-2xl bg-accent px-5 py-2.5 text-[22px] leading-8 font-semibold text-on-accent shadow-[0_2px_2px_rgba(0,0,0,0.1),0_2px_3px_rgba(0,0,0,0.1)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";

const arrow =
  "rounded-full transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40";

type CarouselControlsProps = {
  /** What one item is called, for screen readers: "avatar", "problem". */
  noun: string;
  index: number;
  count: number;
  /** Name of the selected item, announced when it changes. */
  selectedName: string;
  onStep(by: number): void;
  className?: string;
};

/** ‹ 2/11 › under a picker. */
export function CarouselControls({ noun, index, count, selectedName, onStep, className = "" }: CarouselControlsProps) {
  const single = count < 2;
  return (
    <div data-no-drag className={`relative z-[200] flex w-[264px] max-w-full items-center justify-between ${className}`}>
      <button type="button" onClick={() => onStep(-1)} disabled={single} aria-label={`Previous ${noun}`} className={arrow}>
        <Image src="/chevron-left.svg" alt="" width={56} height={56} />
      </button>
      <p aria-live="polite" className="text-4xl leading-none font-bold tracking-[-0.9px] text-fg tabular-nums">
        {count ? index + 1 : 0}/{count}
        <span className="sr-only">, {selectedName}</span>
      </p>
      <button type="button" onClick={() => onStep(1)} disabled={single} aria-label={`Next ${noun}`} className={arrow}>
        <Image src="/chevron-right.svg" alt="" width={56} height={56} />
      </button>
    </div>
  );
}
