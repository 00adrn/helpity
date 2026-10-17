// Tailwind classes for the Figma "Button" component's variants.
// Every variant has a 1px border so swapping variants (e.g. Raise/Lower hand) never changes size.
const base =
  "rounded-lg border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";

export const button = {
  primary: `${base} border-transparent bg-accent text-on-accent shadow-sm hover:brightness-110`,
  secondary: `${base} border-border bg-surface text-fg hover:bg-surface-sunken`,
  danger: `${base} border-red-200 bg-surface text-red-600 hover:bg-red-50`,
} as const;
