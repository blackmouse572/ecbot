import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIconStack } from "@/components/platform-icon/platform-icon-stack";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Text, Tooltip } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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
  const { workspaceSlug } = useWorkspaceParams();

  if (accounts.length === 0) {
    return (
      <Link
        to={`/${workspaceSlug}/${ROUTES.Accounts}`}
        // The row itself opens the agent.
        onClick={(event) => event.stopPropagation()}
        className="txt-compact-small-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover whitespace-nowrap"
      >
        {t("chatbot.list.columns.connectChannel")}
      </Link>
    );
  }

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
        <PlatformIconStack types={accounts.map((account) => account.type)} />
        <Text size="small" className="text-ui-fg-subtle truncate">
          {t("chatbot.list.columns.accountCount", { count: accounts.length })}
        </Text>
      </div>
    </Tooltip>
  );
};
