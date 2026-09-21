import { clx, Container, Divider, Heading } from "@medusajs/ui";
import { Section, SectionRow } from "@repo/ui/common-components";
import type { ToolResponseDto } from "@repo/client";
import { useDate } from "@/hooks/use-date";
import { useTranslation } from "react-i18next";
import { By } from "@/components/common";

type ToolMetadataSectionProps = {
  item: ToolResponseDto;
} & React.HTMLAttributes<HTMLDivElement>;

export const ToolMetadataSection = ({
  item,
  className,
  ...rest
}: ToolMetadataSectionProps) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();

  return (
    <Container className={clx("p-0", className)} {...rest}>
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <Heading>{t("tools.details.sections.metadata")}</Heading>
      </div>
      <Divider variant="dashed" />
      <Section variant="spaced">
        <SectionRow title={t("tools.details.fields.id")} value={item.id} />
        <SectionRow
          title={t("tools.details.fields.createdAt")}
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
            title={t("tools.details.fields.updatedAt")}
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
