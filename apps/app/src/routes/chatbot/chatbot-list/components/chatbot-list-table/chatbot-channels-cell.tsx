import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { channelOf } from "@/components/platform-icon/channel-catalog";
import { Text, Tooltip } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const MAX_LOGOS = 4;

type Props = {
  accounts: Pick<AccountGetDetailResponseDto, "id" | "type" | "name">[];
};

/**
 * The accounts an agent answers on, stacked like the customer list's channels
 * cell. One mark per account: an agent can answer on several pages of one
 * platform, and each counts.
 */
export const ChatbotChannelsCell: FC<Props> = ({ accounts }) => {
  const { t } = useTranslation();

  if (accounts.length === 0) {
    return (
      <Text
        size="small"
        weight="plus"
        className="text-ui-fg-interactive whitespace-nowrap"
      >
        {t("chatbot.list.columns.connectChannel")}
      </Text>
    );
  }

  const shown = accounts.slice(0, MAX_LOGOS);
  const hidden = accounts.length - shown.length;

  return (
    <Tooltip
      content={
        <ul className="flex flex-col gap-y-0.5">
          {accounts.map((account) => (
            <li key={account.id}>
              {channelOf(account.type).label}: {account.name}
            </li>
          ))}
        </ul>
      }
    >
      <div className="flex items-center gap-x-2">
        <div className="flex shrink-0 items-center -space-x-1.5">
          {shown.map((account) => (
            <PlatformIcon
              key={account.id}
              type={account.type}
              size={20}
              className="ring-ui-bg-base shrink-0 ring-2"
            />
          ))}
          {hidden > 0 && (
            <span className="bg-ui-bg-subtle text-ui-fg-subtle ring-ui-bg-base flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] leading-none ring-2">
              +{hidden}
            </span>
          )}
        </div>
        <Text size="small" className="text-ui-fg-subtle truncate">
          {t("chatbot.list.columns.accountCount", { count: accounts.length })}
        </Text>
      </div>
    </Tooltip>
  );
};
