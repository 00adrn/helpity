import type { PresetLevel } from "@/lib/problems/presets";

/**
 * Who Helpity is talking to. The teacher picks one for the whole session; it changes Helpity's
 * voice (see the audience instructions in app/api/ai/route.ts), never its tutoring rules.
 */
export const HELPITY_LEVELS = ["elementary", "highSchool", "advanced"] as const;
export type HelpityLevel = (typeof HELPITY_LEVELS)[number];

export const HELPITY_LEVEL_LABELS: Record<HelpityLevel, string> = {
  elementary: "Elementary",
  highSchool: "High school",
  advanced: "Advanced",
};

/**
 * A sample answer at each level, shown in the teacher's picker. All three answer the same
 * thing (a student asking about `for (let i = 1; i < n; i++)` that skips n) and, like the real
 * prompts, hint without handing over the fix.
 */
export const HELPITY_LEVEL_EXAMPLES: Record<HelpityLevel, string> = {
  elementary: "This loop counts up one number at a time. Look closely at where it stops. Does it ever reach n, or stop one short?",
  highSchool: "This loop runs while i is less than n, so the last value of i is n minus 1. Trace it with n = 4. Is that the range you want?",
  advanced: "The condition i < n makes the upper bound exclusive. Compare that with the range you meant to sum; this looks like an off-by-one.",
};

export const DEFAULT_HELPITY_LEVEL: HelpityLevel = "elementary";

export function isHelpityLevel(value: unknown): value is HelpityLevel {
  return HELPITY_LEVELS.includes(value as HelpityLevel);
}

/** A sensible starting level for a problem: Elementary and Middle School problems get Elementary. */
export function helpityLevelFor(problemLevel: PresetLevel): HelpityLevel {
  return problemLevel === "high" ? "highSchool" : "elementary";
}
