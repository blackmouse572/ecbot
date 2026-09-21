import type { Filter } from "@/components/table/data-table";
import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { useAccounts } from "@/hooks/api";
import { defaultNs } from "@/i18n";
import {
  CHATBOT_CONSTANTS,
  CHATBOT_TYPE_CONFIG,
  type ChatbotTypeConfigItem,
} from "@/routes/chatbot/constants";
import { Avatar } from "@medusajs/ui";
import type { AccountListResponseDto } from "@repo/client";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChatbotTypeIcon } from "../chatbot-type-badge";

type SelectFilter = Extract<Filter, { type: "select" }>;
type SelectOption = SelectFilter["options"][number];

/** Every account the workspace owns can be picked as a facet value. */
const ACCOUNTS_QUERY = {
  perPage: CHATBOT_CONSTANTS.ACCOUNTS_PER_PAGE,
  page: CHATBOT_CONSTANTS.DEFAULT_ACCOUNTS_PAGE,
};

/** Industry option: the type icon tinted with that type's own colour. */
const typeOption = (config: ChatbotTypeConfigItem) => (
  <div className="flex gap-2 items-center">
    <ChatbotTypeIcon
      config={config}
      className={`size-4 text-ui-tag-${config.color}-icon`}
    />
    <span>{config.label}</span>
  </div>
);

/** Account option: channel avatar beside the account name. */
const accountOption = (account: AccountListResponseDto) => {
  const { avatar, name } = account;
  const initials = getAvatarFallback(name);

  return (
    <div className="flex items-center">
      <Avatar src={avatar} fallback={initials} size="xsmall" className="mr-2" />
      <span className="truncate">{name}</span>
    </div>
  );
};

/** All three facets are searchable selects; only the type facet is multi. */
const facet = (
  key: string,
  label: string,
  options: SelectOption[],
  multiple = false,
): SelectFilter => ({
  key,
  label,
  options,
  multiple,
  type: "select",
  searchable: true,
});

/** Status, industry type and account facets above the chatbot table. */
export const useChatbotTableFilters = (): Filter[] => {
  const { t } = useTranslation(defaultNs);
  const { accounts } = useAccounts(ACCOUNTS_QUERY);

  return useMemo<Filter[]>(
    () => [
      facet(
        "status",
        t("fields.status"),
        [
          ["active", t("chatbot.list.columns.statusOptions.active")],
          ["inactive", t("chatbot.list.columns.statusOptions.inactive")],
        ].map(([value, label]) => ({ value, label })),
      ),
      facet(
        "type",
        t("fields.type"),
        Object.values(CHATBOT_TYPE_CONFIG).map((config) => ({
          value: config.label.toLowerCase(),
          label: config.label,
          renderItem: () => typeOption(config),
        })),
        true,
      ),
      facet(
        "account",
        t("fields.accounts"),
        (accounts ?? []).map((account) => ({
          value: account.id,
          label: account.name,
          renderItem: () => accountOption(account),
        })),
      ),
    ],
    [accounts, t],
  );
};
