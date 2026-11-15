import { useMarketingDate } from "@/components/customer-marketing";
import type { CustomerMarketingStateGetResponseDto } from "@/hooks/api/customer-marketing";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type Props = {
  source: CustomerMarketingStateGetResponseDto["firstSource"];
};

const KEY = "conversations.customer.panel.marketing.firstSource";

/** Nguồn đầu tiên: the source link the customer first came through. */
export const MarketingFirstSource: FC<Props> = ({ source }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const formatDate = useMarketingDate();

  if (!source) {
    return (
      <Text size="small" className="text-ui-fg-muted">
        {t("customerMarketing.firstSource.direct")}
      </Text>
    );
  }

  const date = formatDate(source.at);

  return (
    <div className="flex flex-col gap-y-0.5">
      <Link
        to={`/${workspaceSlug}/${ROUTES.CustomerSources}/${source.sourceId}`}
        className="txt-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover self-start"
      >
        {source.sourceName}
      </Link>
      <Text size="xsmall" className="text-ui-fg-muted">
        {source.codeName
          ? t(`${KEY}.viaCode`, { code: source.codeName, date })
          : t(`${KEY}.viaSource`, { date })}
      </Text>
    </div>
  );
};
