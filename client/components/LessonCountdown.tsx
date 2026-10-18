"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { fade } from "@/lib/motion";

const SECONDS = 3;

/**
 * Full-screen "A new lesson is coming!" with a big 3, 2, 1, shown to students when the teacher
 * switches lessons. The new lesson loads underneath, so it's ready when the countdown ends.
 */
export function LessonCountdown({ onDone }: { onDone(): void }) {
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left <= 0) onDone();
  }, [left, onDone]);

  return (
    <motion.div
      {...fade}
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-bg/95 p-6 text-center backdrop-blur-sm"
    >
      <p className="text-4xl font-bold tracking-[-0.9px] text-fg">A new lesson is coming!</p>
      {/* A new key per number, so each one springs in. */}
      <motion.span
        // At 0 the overlay is fading out, so keep showing 1 rather than springing it in again.
        key={Math.max(left, 1)}
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
        className="text-[160px] leading-none font-bold text-accent"
      >
        {Math.max(left, 1)}
      </motion.span>
    </motion.div>
  );
}
