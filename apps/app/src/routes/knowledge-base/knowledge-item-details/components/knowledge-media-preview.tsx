import { Text } from "@medusajs/ui";
import type { KnowledgeItemResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type KnowledgeMediaPreviewProps = {
  item: KnowledgeItemResponseDto;
};

/**
 * A media item as the customer will receive it (the image, or the PDF), and
 * the description the agent searches by.
 */
export const KnowledgeMediaPreview: FC<KnowledgeMediaPreviewProps> = ({
  item,
}) => {
  const { t } = useTranslation();
  const { attachment } = item;
  const src = attachment?.cdnUrl || attachment?.completedUrl;

  return (
    <div className="flex flex-col gap-y-4">
      {src && attachment?.mime === "application/pdf" ? (
        <iframe
          src={src}
          title={item.title}
          className="h-96 w-full rounded-md border border-ui-border-base"
        />
      ) : (
        src && (
          <img
            src={src}
            alt={item.title}
            className="max-h-96 w-fit max-w-full rounded-md border border-ui-border-base object-contain"
          />
        )
      )}
      <div className="flex flex-col gap-y-1">
        <Text size="small" weight="plus" className="text-ui-fg-subtle">
          {t("knowledge_item.media.description")}
        </Text>
        <Text className="whitespace-pre-wrap break-words text-ui-fg-base">
          {item.content || t("knowledge_item.media.description_pending")}
        </Text>
      </div>
    </div>
  );
};
