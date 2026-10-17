import Image from "next/image";

/** Every avatar a student can pick (Figma "Avatars" component). Images live in public/avatars. */
export const AVATARS = [
  { id: "unicorn", name: "Unicorn" },
  { id: "hedgehog", name: "Hedgehog" },
  { id: "panda", name: "Panda" },
  { id: "fox", name: "Fox" },
  { id: "dragon", name: "Dragon" },
  { id: "owl", name: "Owl" },
  { id: "penguin", name: "Penguin" },
  { id: "frog", name: "Frog" },
  { id: "cyclops", name: "Cyclops" },
  { id: "octopus", name: "Octopus" },
  { id: "axolotl", name: "Axolotl" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

/** Avatars arrive from other participants, so check them before building an image path. */
export function isAvatarId(value: unknown): value is AvatarId {
  return AVATARS.some((avatar) => avatar.id === value);
}

export function avatarName(id: AvatarId): string {
  return AVATARS.find((avatar) => avatar.id === id)?.name ?? id;
}

/** Every avatar id in a fresh random order (Fisher–Yates). */
export function shuffledAvatars(): AvatarId[] {
  const ids: AvatarId[] = AVATARS.map((avatar) => avatar.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function randomAvatar(): AvatarId {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
}

type AvatarProps = {
  /** Unknown or missing ids fall back to a dot in `color`. */
  id: string | undefined;
  size: number;
  color?: string;
  alt?: string;
  className?: string;
};

/** A circular avatar illustration. */
export function Avatar({ id, size, color = "var(--border)", alt = "", className = "" }: AvatarProps) {
  if (!isAvatarId(id)) {
    return (
      <span
        aria-hidden
        className={`block shrink-0 rounded-full ${className}`}
        style={{ width: size, height: size, backgroundColor: color }}
      />
    );
  }

  return (
    <Image
      src={`/avatars/${id}.jpg`}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  );
}
