import { Text } from "@medusajs/ui";
import type { KnowledgeItemResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type KnowledgeUrlPreviewProps = {
  item: KnowledgeItemResponseDto;
};

/**
 * What the agent read from a website: the address, the start page's title
 * and the start of the text, and how many pages it read (`metadata`, set by
 * ingest), so the owner can check the page was actually read.
 */
export const KnowledgeUrlPreview: FC<KnowledgeUrlPreviewProps> = ({ item }) => {
  const { t } = useTranslation();
  const { metadata } = item;
  const pageTitle =
    typeof metadata?.pageTitle === "string" ? metadata.pageTitle : undefined;
  const preview =
    typeof metadata?.preview === "string" ? metadata.preview : undefined;

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-1">
        {pageTitle && (
          <Text weight="plus" className="text-ui-fg-base break-words">
            {pageTitle}
          </Text>
        )}
        <Text size="small" className="text-ui-fg-muted break-all">
          {item.content}
        </Text>
      </div>
      {preview && (
        <Text className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-ui-bg-subtle p-3 text-ui-fg-subtle">
          {preview}
        </Text>
      )}
      <Text size="small" className="text-ui-fg-subtle">
        {item.status === "COMPLETED"
          ? t("knowledge_item.url_learned", {
              count: Number(metadata?.pagesCrawled ?? 1),
              sections: Number(metadata?.chunkCount ?? 0),
            })
          : item.status === "FAILED"
            ? t("knowledge_item.url_learn_failed")
            : t("knowledge_item.url_not_learned_yet")}
      </Text>
    </div>
  );
};
