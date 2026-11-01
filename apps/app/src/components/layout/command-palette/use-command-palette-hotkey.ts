import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { commandPaletteOpenAtom } from "./state";

/** Toggles the command palette on Cmd+K (Mac) or Ctrl+K (everywhere else). */
export const useCommandPaletteHotkey = () => {
  const setOpen = useSetAtom(commandPaletteOpenAtom);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.shiftKey) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setOpen((open) => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);
};
