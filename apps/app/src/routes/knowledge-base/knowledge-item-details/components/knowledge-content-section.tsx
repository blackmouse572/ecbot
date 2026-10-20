import { Container, Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { KnowledgeFilePreview } from "./knowledge-file-preview";
import { KnowledgeMediaPreview } from "./knowledge-media-preview";
import { KnowledgeUrlPreview } from "./knowledge-url-preview";
import { KnowledgeItemContentActionType } from "./knowlege-item-content-action-type";

type KnowledgeContentSectionProps = {
  item: KnowledgeItemResponseDto;
};

export const KnowledgeContentSection = ({
  item,
}: KnowledgeContentSectionProps) => {
  const { t } = useTranslation();

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4 flex justify-between items-center">
        <Heading level="h2" className="text-lg font-semibold">
          {t("knowledge_item.content")}
        </Heading>
        <div className="space-y-2">
          <KnowledgeItemContentActionType item={item} />
        </div>
      </div>

      <div className="px-6 py-4">
        {item.type === "FILE" ? (
          <KnowledgeFilePreview item={item} />
        ) : item.type === "MEDIA" ? (
          <KnowledgeMediaPreview item={item} />
        ) : item.type === "URL" ? (
          <KnowledgeUrlPreview item={item} />
        ) : (
          <Text className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words text-ui-fg-base">
            {item.content}
          </Text>
        )}
      </div>
    </Container>
  );
};
