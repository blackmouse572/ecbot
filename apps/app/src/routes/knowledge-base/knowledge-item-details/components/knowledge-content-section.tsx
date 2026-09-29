import { Container, Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { KnowledgeFilePreview } from "./knowledge-file-preview";
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

      {/* Content container with responsive grid layout */}
      <div className="px-6 py-6">
        <div className="rounded-md bg-ui-bg-subtle p-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {item.type === "FILE" ? (
              <KnowledgeFilePreview item={item} />
            ) : item.type === "URL" ? (
              <div className="space-y-2">
                <p className="break-words text-sm text-ui-fg-base">
                  {item.content}
                </p>
              </div>
            ) : (
              <pre className="max-h-96 overflow-auto rounded bg-ui-bg-base p-4 text-xs font-mono text-ui-fg-base">
                {item.content}
              </pre>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
};
