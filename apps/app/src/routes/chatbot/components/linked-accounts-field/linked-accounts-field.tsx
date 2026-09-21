import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { useAccounts, useUnlinkAccounts } from "@/hooks/api";
import { MagnifyingGlass, XMarkMini } from "@medusajs/icons";
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  Label,
  Popover,
} from "@medusajs/ui";
import type { AccountListResponseDto } from "@repo/client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CHATBOT_CONSTANTS } from "../../constants";

const { Trigger: PopoverTrigger, Content: PopoverContent } = Popover;

/** The picker loads one large page rather than paginating inside a popover. */
const ACCOUNTS_PER_PAGE = 100;

/** Shown for accounts the platform never gave a name. */
const UNNAMED_ACCOUNT = "Unnamed Account";

/** Makes the trigger read like the form fields around it. */
const TRIGGER_CLASS =
  "caret-ui-fg-base bg-ui-bg-field hover:bg-ui-bg-field-hover w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px] shadow-borders-base";

const SEARCH_ICON = <MagnifyingGlass className="me-2" />;

const labelOf = (account: AccountListResponseDto) =>
  account.name || UNNAMED_ACCOUNT;

type AccountAvatarProps = {
  account: AccountListResponseDto;
  className: string;
};

/** Channel avatar for an account, sized by whichever list renders it. */
const AccountAvatar = ({ account, className }: AccountAvatarProps) => (
  <Avatar
    src={account.avatar}
    fallback={getAvatarFallback(account.name)}
    className={className}
  />
);

/** Row inside the picker popover. */
const AccountOption = ({ account }: { account: AccountListResponseDto }) => (
  <div className="flex items-center gap-3">
    <AccountAvatar account={account} className="w-6 h-6" />
    <span className="text-sm font-medium">{labelOf(account)}</span>
  </div>
);

type SelectedAccountChipProps = {
  account: AccountListResponseDto;
  onRemove: () => void;
};

/** Chip for an account already in the field, with its own remove button. */
const SelectedAccountChip = ({
  account,
  onRemove,
}: SelectedAccountChipProps) => (
  <Badge className="flex items-center gap-2">
    <AccountAvatar account={account} className="size-4 rounded-xs" />
    <span className="text-sm font-medium">{labelOf(account)}</span>
    <IconButton
      variant="transparent"
      size="small"
      onClick={onRemove}
      className="hover:bg-transparent active:bg-transparent"
    >
      <XMarkMini className="size-3" />
    </IconButton>
  </Badge>
);

type LinkedAccountsFieldProps = {
  value?: string[];
  onChange: (value: string[]) => void;
};

/** Multi-select of the accounts a chatbot answers on, held as account ids. */
export function LinkedAccountsField({
  value = [],
  onChange,
}: LinkedAccountsFieldProps) {
  const { t } = useTranslation();
  const { accounts: allAccounts } = useAccounts({ perPage: ACCOUNTS_PER_PAGE });
  const { accounts: freeAccounts } = useUnlinkAccounts({
    perPage: ACCOUNTS_PER_PAGE,
    page: CHATBOT_CONSTANTS.DEFAULT_ACCOUNTS_PAGE,
  });
  const linkedOnOpen = useRef(value);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selected = useMemo(
    () => (allAccounts ?? []).filter((account) => value.includes(account.id)),
    [allAccounts, value],
  );

  // Offer what is unlinked elsewhere, plus what this chatbot already owned when
  // the form opened — those were dropped from the field but are not saved yet.
  const selectable = useMemo(() => {
    const free = new Set(freeAccounts?.map((account) => account.id) ?? []);
    const owned = new Set(linkedOnOpen.current);

    return allAccounts?.filter(
      (account) =>
        (free.has(account.id) || owned.has(account.id)) &&
        !value.includes(account.id),
    );
  }, [allAccounts, freeAccounts, value]);

  const link = (accountId: string) => {
    onChange([...value, accountId]);
    setPickerOpen(false);
  };

  const unlink = (accountId: string) =>
    onChange(value.filter((id) => id !== accountId));

  const triggerLabel =
    selected.length > 0
      ? t("general.countSelected", { count: selected.length })
      : t("chatbot.edit.select");
  const searchPlaceholder = t("app.search.label");
  const emptyMessage = t("chatbot.edit.noAccountsAvailable");

  return (
    <div className="flex flex-col gap-2">
      <Label>{t("chatbot.edit.linkAccounts")}</Label>
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            role="combobox"
            aria-expanded={pickerOpen}
            className={TRIGGER_CLASS}
          >
            <span className="truncate">{triggerLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <Command>
            <CommandInput icon={SEARCH_ICON} placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {selectable?.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={labelOf(account)}
                    onSelect={() => link(account.id)}
                  >
                    <AccountOption account={account} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 py-2">
          {selected.map((account) => (
            <SelectedAccountChip
              key={account.id}
              account={account}
              onRemove={() => unlink(account.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
