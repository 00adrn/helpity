"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** App-wide client settings. Animations are skipped for people who ask for reduced motion. */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
