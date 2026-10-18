import { useWorkspace } from "@/hooks/api";
import { Button, IconButton, Prompt, toast } from "@medusajs/ui";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@repo/ui/components";
import { IconClipboard, IconClipboardCheckFilled } from "@tabler/icons-react";
import { t } from "i18next";
import type React from "react";
import { useEffect, useState } from "react";
import { useCopyToClipboard, useDebounceValue } from "usehooks-ts";
import { MemberInvitableList } from "./member-invitable-list";
import { MemberInvitedList } from "./member-invited-list";

const SEARCH_DEBOUNCE_MS = 500;
const COPIED_FEEDBACK_MS = 2000;

export const MemberInviteDialog = (
  props: React.ComponentPropsWithoutRef<typeof Prompt>,
) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(query, SEARCH_DEBOUNCE_MS);
  const [, copyToClipboard] = useCopyToClipboard();
  const [justCopied, setJustCopied] = useState(false);
  const { workspace } = useWorkspace();

  const isOpen = props.open === true;
  const invitationCode = workspace?.invitationCode;

  const { onOpenChange } = props;

  // Prompt is an alert dialog, which ignores outside taps, so close it ourselves.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        target &&
        !target.closest('[role="alertdialog"], [data-sonner-toast]')
      ) {
        onOpenChange?.(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [isOpen, onOpenChange]);

  const copyInvitationCode = () => {
    if (!invitationCode) {
      return;
    }

    copyToClipboard(invitationCode)
      .then(() => {
        toast.success(t("members.inviteMember.inviteCode.copySuccess"));
        setJustCopied(true);
        setTimeout(() => setJustCopied(false), COPIED_FEEDBACK_MS);
      })
      .catch((reason) => {
        console.error("Failed to copy!", reason);
      });
  };

  return (
    <Prompt {...props}>
      <Prompt.Content className="max-w-full sm:max-w-3/5">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("members.inviteMember.placeholder")}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <MemberInvitableList enabled={isOpen} search={debouncedQuery} />
            <MemberInvitedList enabled={isOpen} search={debouncedQuery} />
            <CommandEmpty className="py-6 text-sm text-ui-fg-muted flex items-center justify-center w-full">
              {t("general.noResultsMessage")}
            </CommandEmpty>
          </CommandList>
        </Command>
        <Prompt.Footer className="py-2 px-4 border-t bg-ui-bg-component flex-wrap items-center justify-between gap-2">
          <Prompt.Cancel asChild>
            <Button size="small" variant="secondary">
              {t("actions.close")}
            </Button>
          </Prompt.Cancel>
          <div className="flex items-center gap-x-2">
            <p className="text-ui-fg-muted text-xs">
              {t("members.inviteMember.inviteCode.title")}:
              <span className="font-bold ml-2">{invitationCode}</span>
            </p>
            <IconButton
              size="small"
              variant="transparent"
              onClick={copyInvitationCode}
              className={justCopied ? "text-ui-tag-green-icon" : ""}
            >
              {justCopied ? (
                <IconClipboardCheckFilled size={14} />
              ) : (
                <IconClipboard size={14} />
              )}
            </IconButton>
          </div>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
};
