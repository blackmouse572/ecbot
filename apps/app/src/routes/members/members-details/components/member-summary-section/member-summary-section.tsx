import { Container, Divider, Heading } from "@medusajs/ui";
import type { UserShortResponseDto } from "@repo/client";
import { Section, SectionRow } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

type MemberSummarySectionProps = {
  item: UserShortResponseDto;
};

export const MemberSummarySection = ({ item }: MemberSummarySectionProps) => {
  const { t } = useTranslation();

  return (
    <Container className="p-0">
      <div className="flex flex-col gap-y-1 p-6 py-4">
        <Heading>{t("chatbot.details.summary.title")}</Heading>
      </div>
      <Divider variant="dashed" />
      <Section variant="spaced">
        <SectionRow title={t("fields.name")} value={item.name} />
        <SectionRow title={t("fields.email")} value={item.email} />
        <SectionRow
          title={t("profile.fields.country")}
          value={item.country.name}
        />
      </Section>
    </Container>
  );
};
