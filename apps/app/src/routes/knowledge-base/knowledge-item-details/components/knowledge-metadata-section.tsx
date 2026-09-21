import { clx, Container, Divider, Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { Section, SectionRow } from "@repo/ui/common-components";

import type { KnowledgeItemResponseDto } from "@repo/client";
import { useDate } from "../../../../hooks/use-date";
import { KnowledgeItemTypeCell } from "../../knowledge-base-list/components/knowledge-base-list-table/knowledge-item-type-cell";
import { KnowledgeItemStatusCell } from "../../knowledge-base-list/components/knowledge-base-list-table/knowledge-item-status-cell";
import { UserLink } from "../../../../components/common";
import { KnowledgeItemTagListCell } from "../../knowledge-base-list/components/knowledge-base-list-table/knowledge-item-tag-list-cell";

type KnowledgeMetadataSectionProps = {
  item: KnowledgeItemResponseDto;
} & React.HTMLAttributes<HTMLDivElement>;

export const KnowledgeMetadataSection = ({
  item,
  className,
  ...rest
}: KnowledgeMetadataSectionProps) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();

  return (
    <Container className={clx("p-0", className)} {...rest}>
      <div className="flex flex-col gap-y-1 p-6 py-4">
        <Heading>{t("knowledge_item.details")}</Heading>
      </div>
      <Divider variant="dashed" />

      <Section variant="spaced">
        <SectionRow title={t("fields.name")} value={item.title} />
        <SectionRow
          title={t("fields.type")}
          value={<KnowledgeItemTypeCell type={item.type} />}
        />
        <SectionRow
          title={t("fields.status")}
          value={<KnowledgeItemStatusCell status={item.status} />}
        />
        {item.tags && (
          <SectionRow
            title={t("knowledge_item.currentTags")}
            value={<KnowledgeItemTagListCell tags={item.tags} />}
          />
        )}
        {item.errorMessage && (
          <SectionRow
            title={t("fields.errorMessage")}
            value={item.errorMessage}
          />
        )}
        <SectionRow
          title={t("fields.createdAt")}
          value={getFullDate(new Date(item.createdAt))}
        />
        {item.createdBy && (
          <SectionRow
            title={t("fields.createdBy")}
            value={<UserLink {...item.createdBy} />}
          />
        )}
        {item.updatedAt && (
          <SectionRow
            title={t("fields.updatedAt")}
            value={getFullDate(new Date(item.updatedAt))}
          />
        )}
        {item.updatedBy && (
          <SectionRow
            title={t("fields.createdBy")}
            value={<UserLink {...item.updatedBy} />}
          />
        )}
      </Section>
    </Container>
  );
};
