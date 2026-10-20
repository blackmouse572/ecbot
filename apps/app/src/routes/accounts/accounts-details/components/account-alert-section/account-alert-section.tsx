import i18n from "@/i18n";
import { CheckCircleSolid, ExclamationCircle, XCircle } from "@medusajs/icons";
import { StatusAlertCard } from "@/components/common";
import type { AccountGetDetailResponseDto } from "@repo/client";

type AccountAlertSectionProps = {
  item: AccountGetDetailResponseDto;
};

export const AccountAlertSection = ({ item }: AccountAlertSectionProps) => {
  const statusTerms =
    item.sendFailingSince && item.status === "ACTIVE"
      ? FailingTerms
      : AccountStatusTerms[item.status];
  return (
    <StatusAlertCard
      icon={statusTerms.icon}
      title={statusTerms.title}
      description={statusTerms.description}
    />
  );
};

const AccountStatusTerms: Record<
  AccountGetDetailResponseDto["status"],
  {
    title: string;
    description?: string;
    icon?: React.ReactNode;
  }
> = {
  ACTIVE: {
    title: i18n.t("accounts.details.statuses.active.title"),
    description: i18n.t("accounts.details.statuses.active.description"),
    icon: <CheckCircleSolid className="text-ui-tag-green-icon" />,
  },
  INACTIVE: {
    title: i18n.t("accounts.details.statuses.inactive.title"),
    description: i18n.t("accounts.details.statuses.inactive.description"),
    icon: <XCircle className="text-ui-tag-gray-icon" />,
  },
  BLOCKED: {
    title: i18n.t("accounts.details.statuses.blocked.title"),
    description: i18n.t("accounts.details.statuses.blocked.description"),
    icon: <CheckCircleSolid className="text-ui-tag-red-icon" />,
  },
};

const FailingTerms = {
  title: i18n.t("accounts.details.statuses.failing.title"),
  description: i18n.t("accounts.details.statuses.failing.description"),
  icon: <ExclamationCircle className="text-ui-tag-orange-icon" />,
};
