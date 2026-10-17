import Image from "next/image";

/** The tilted smiley plus "Helpity" wordmark. "lg" on the landing page, "md" in the navbar. */
export function HelpityLogo({ size = "md" }: { size?: "md" | "lg" }) {
  const large = size === "lg";
  // The art's circle fills ~91% of the image, so this keeps the smiley the same visual size.
  const icon = large ? 30 : 20;

  return (
    <span className="inline-flex items-end">
      <span
        className={`-mr-0.5 flex shrink-0 items-center justify-center ${large ? "size-[35px]" : "size-[23.5px]"}`}
      >
        <Image
          src="/helpity/helpity_happy_rendered.png"
          alt=""
          width={icon}
          height={icon}
          className="-rotate-[22.28deg]"
        />
      </span>
      <span
        className={
          large
            ? "text-5xl leading-none font-bold tracking-[-1.2px] text-fg"
            : "text-3xl leading-none font-bold text-fg"
        }
      >
        Helpity
      </span>
    </span>
  );
}
