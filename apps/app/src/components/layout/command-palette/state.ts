import { atom } from "jotai";

/** Whether the Cmd+K command palette is open. Set by the sidebar Search item and the shortcut. */
export const commandPaletteOpenAtom = atom(false);
