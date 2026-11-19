/** Session codes are 6 letters and digits (see createRoomCode in data_store.ts). */
export const JOIN_CODE_LENGTH = 6;

/**
 * What a join code field should hold after the user types or pastes `text`. A pasted join link
 * (".../join/AB12CD") keeps only the code after "/join/"; anything else is uppercased, stripped
 * to letters and digits and cut to 6, so the copied link and the bare code both work.
 */
export function joinCodeFrom(text: string): string {
  const fromLink = /\/join\/([^/?#\s]*)/i.exec(text)?.[1];
  return (fromLink ?? text)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, JOIN_CODE_LENGTH);
}

/**
 * Paste handler for a join code field. The field's maxLength would cut a pasted link down to
 * "HTTPSH" before onChange sees it, so read the whole pasted text here and keep only the code.
 */
export function pasteJoinCode(set: (code: string) => void) {
  return (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    set(joinCodeFrom(event.clipboardData.getData("text")));
  };
}
