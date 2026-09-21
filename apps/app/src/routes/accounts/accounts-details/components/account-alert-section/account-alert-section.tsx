import i18n from "@/i18n";
import { CheckCircleSolid, XCircle } from "@medusajs/icons";
import { Container, Heading, Text } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";

type AccountAlertSectionProps = {
  item: AccountGetDetailResponseDto;
};

export const AccountAlertSection = ({ item }: AccountAlertSectionProps) => {
  const statusTerms = AccountStatusTerms[item.status];
  return (
    <Container className="flex gap-4">
      <span className="flex-shrink-0 py-1">{statusTerms.icon}</span>
      <div>
        <Heading level="h3">{statusTerms.title}</Heading>
        {statusTerms.description && (
          <Text size="xsmall" className="text-ui-fg-muted">
            {statusTerms.description}
          </Text>
        )}
      </div>
    </Container>
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
