import { AccountStatusCell } from "@/routes/accounts/accounts-list/components/account-list-table/account-status-cell";
import { Container, Divider, Heading } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import { Section, SectionRow } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

type AccountSummarySectionProps = {
  item: AccountGetDetailResponseDto;
};

export const AccountSummarySection = ({ item }: AccountSummarySectionProps) => {
  const { t } = useTranslation();

  return (
    <Container className="p-0">
      <div className="flex flex-col gap-y-1 p-6 py-4">
        <Heading>{t("chatbot.details.summary.title")}</Heading>
      </div>
      <Divider variant="dashed" />
      <Section variant="spaced">
        <SectionRow title={t("fields.name")} value={item.name} />
        <SectionRow
          title={t("accounts.create.fields.link")}
          value={item.link}
        />
        <SectionRow
          title={t("fields.status")}
          value={<AccountStatusCell status={item.status} />}
        />
        <SectionRow
          title={t("fields.createdAt")}
          value={new Date(item.createdAt).toLocaleDateString()}
        />
        <SectionRow
          title={t("fields.updatedAt")}
          value={new Date(item.updatedAt).toLocaleDateString()}
        />
      </Section>
    </Container>
  );
};
