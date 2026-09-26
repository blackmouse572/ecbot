import type { KnowledgeItemResponseDto } from "@repo/client";

import { ArrowDownTray, Eye } from "@medusajs/icons";
import { Button } from "@medusajs/ui";
import type { KnowledgeItemType } from "../../knowledge-item-create/components/knowledge-item-type-selector";
import { useTranslation } from "react-i18next";

export function KnowledgeItemContentActionType(props: {
  item: KnowledgeItemResponseDto;
}) {
  const { t } = useTranslation();
  const { item } = props;
  const type = props.item.type as KnowledgeItemType;

  if (type === "URL") {
    return (
      <Button variant="secondary" asChild>
        <a href={item.content} target="_blank" rel="noreferrer">
          <Eye />
          {t("actions.view")}
        </a>
      </Button>
    );
  } else if (type === "FILE") {
    return (
      <Button variant="secondary" asChild>
        <a href={item.attachment?.cdnUrl} target="_blank" rel="noreferrer">
          <ArrowDownTray />
          {t("actions.download")}
        </a>
      </Button>
    );
  }
  return null;
}
