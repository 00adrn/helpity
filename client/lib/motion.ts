// Shared Notion-style motion: quick, small and soft. Spread onto a motion element inside
// <AnimatePresence> so it animates in and out, e.g. <motion.div {...pop}>.

/** Fast out, gentle settle. */
const ease = [0.2, 0, 0, 1] as const;

/** Menus, tooltips and bubbles: fade in while dropping 4px and growing from 97%. */
export const pop = {
  initial: { opacity: 0, scale: 0.97, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease } },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12, ease } },
};

/** Full-screen overlays: a plain fade. */
export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease } },
  exit: { opacity: 0, transition: { duration: 0.15, ease } },
};
