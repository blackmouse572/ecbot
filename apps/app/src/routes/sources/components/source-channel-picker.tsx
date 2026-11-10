import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { channelOf } from "@/components/platform-icon/channel-catalog";
import { Badge, Text, clx } from "@medusajs/ui";
import type { AccountListResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { SOURCE_ACCOUNT_TYPES, SOURCE_SOON_ACCOUNT_TYPES } from "../constants";

type SourceChannelPickerProps = {
  accounts: AccountListResponseDto[];
  value: string;
  onChange: (account: AccountListResponseDto) => void;
};

/** One card per connected channel a link can open; Zalo OA shows "Coming soon". */
export const SourceChannelPicker: FC<SourceChannelPickerProps> = ({
  accounts,
  value,
  onChange,
}) => {
  const { t } = useTranslation();

  const choices = accounts.filter(
    (account) =>
      SOURCE_ACCOUNT_TYPES.includes(account.type) ||
      SOURCE_SOON_ACCOUNT_TYPES.includes(account.type),
  );

  if (choices.length === 0) {
    return (
      <Text size="small" className="text-ui-fg-subtle">
        {t("customerSources.form.noChannels")}
      </Text>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("customerSources.form.channel")}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {choices.map((account) => {
        const soon = SOURCE_SOON_ACCOUNT_TYPES.includes(account.type);
        const selected = account.id === value;

        return (
          <button
            key={account.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={soon}
            onClick={() => onChange(account)}
            className={clx(
              "flex min-w-0 items-center gap-x-3 rounded-lg border bg-ui-bg-base px-3 py-2.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:shadow-borders-focus",
              selected
                ? "border-ui-border-interactive bg-ui-bg-highlight"
                : "border-ui-border-base hover:bg-ui-bg-base-hover",
              soon && "cursor-not-allowed bg-ui-bg-disabled opacity-60",
            )}
          >
            <PlatformIcon type={account.type} aria-hidden />
            <div className="min-w-0 flex-1">
              <Text size="small" weight="plus" className="truncate">
                {account.name}
              </Text>
              <Text size="xsmall" className="truncate text-ui-fg-subtle">
                {channelOf(account.type).label}
              </Text>
            </div>
            {soon && (
              <Badge size="2xsmall" color="blue" className="shrink-0">
                {t("customerSources.comingSoon")}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
};
