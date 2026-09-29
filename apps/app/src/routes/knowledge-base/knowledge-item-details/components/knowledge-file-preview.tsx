import { formatFileSize } from "@/utils";
import { Text } from "@medusajs/ui";
import type { KnowledgeItemResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type KnowledgeFilePreviewProps = {
  item: KnowledgeItemResponseDto;
};

/**
 * What the owner can check for an uploaded file: a PDF renders inline, other
 * formats show their name, type and size, and the footer says how many
 * sections the assistant learned (`metadata.chunkCount`, set by ingest).
 */
export const KnowledgeFilePreview: FC<KnowledgeFilePreviewProps> = ({
  item,
}) => {
  const { t } = useTranslation();
  const { attachment, metadata } = item;
  const fileName =
    typeof metadata?.fileName === "string" ? metadata.fileName : item.title;
  const chunkCount = Number(metadata?.chunkCount ?? 0);

  return (
    <div className="flex flex-col gap-y-4">
      {attachment?.mime === "application/pdf" && attachment.cdnUrl ? (
        <iframe
          src={attachment.cdnUrl}
          title={item.title}
          className="h-96 w-full rounded-md border border-ui-border-base"
        />
      ) : (
        <div className="flex flex-col items-center gap-y-1 py-6 text-center">
          <Text weight="plus" className="text-ui-fg-base break-all">
            {fileName}
          </Text>
          {attachment && (
            <Text size="small" className="text-ui-fg-muted">
              {attachment.extension.toUpperCase()},{" "}
              {formatFileSize(attachment.size)}
            </Text>
          )}
        </div>
      )}
      <Text size="small" className="text-ui-fg-subtle">
        {item.status === "COMPLETED"
          ? t("knowledge_item.learned_chunks", { count: chunkCount })
          : t("knowledge_item.not_learned_yet")}
      </Text>
    </div>
  );
};
