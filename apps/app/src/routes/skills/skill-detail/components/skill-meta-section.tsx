import { By } from "@/components/common";
import { useDate } from "@/hooks/use-date";
import { clx, Container, Divider, Heading } from "@medusajs/ui";
import type { SkillGetResponseDto } from "@repo/client";
import { Section, SectionRow } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

type SkillMetaSectionProps = {
  item: SkillGetResponseDto;
} & React.HTMLAttributes<HTMLDivElement>;

// Created/updated audit info — mirrors ToolMetadataSection's layout & styles.
export const SkillMetaSection = ({
  item,
  className,
  ...rest
}: SkillMetaSectionProps) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();

  return (
    <Container className={clx("p-0", className)} {...rest}>
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <Heading>{t("skills.detail.sections.metadata")}</Heading>
      </div>
      <Divider variant="dashed" />
      <Section variant="spaced">
        <SectionRow title={t("skills.detail.fields.id")} value={item.id} />
        <SectionRow
          title={t("skills.detail.fields.createdAt")}
          value={getFullDate(new Date(item.createdAt))}
        />
        {item.createdBy && (
          <SectionRow
            title={t("fields.createdBy")}
            value={<By id={item.createdBy.id} />}
          />
        )}
        {item.updatedAt && (
          <SectionRow
            title={t("skills.detail.fields.updatedAt")}
            value={getFullDate(new Date(item.updatedAt))}
          />
        )}
        {item.updatedBy && (
          <SectionRow
            title={t("fields.updatedBy")}
            value={<By id={item.updatedBy.id} />}
          />
        )}
      </Section>
    </Container>
  );
};
