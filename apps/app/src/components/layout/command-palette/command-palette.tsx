import { CommandPrompt } from "@repo/ui/components";
import { useAtom } from "jotai";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { CommandPaletteContent } from "./command-palette-content";
import { commandPaletteOpenAtom } from "./state";
import { useCommandPaletteHotkey } from "./use-command-palette-hotkey";

/** Cmd+K / Ctrl+K search across pages and workspace data. Mount once per layout. */
export const CommandPalette: FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useAtom(commandPaletteOpenAtom);
  useCommandPaletteHotkey();

  return (
    <CommandPrompt
      open={open}
      onOpenChange={setOpen}
      title={t("commandPalette.title")}
      description={t("commandPalette.description")}
      // Entity results are already searched on the server.
      commandProps={{ shouldFilter: false }}
    >
      <CommandPaletteContent onClose={() => setOpen(false)} />
    </CommandPrompt>
  );
};
