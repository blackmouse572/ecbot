import type { KnowledgeItemResponseDto } from "@repo/client";

import { ArrowDownTray, Eye } from "@medusajs/icons";
import type { KnowledgeItemType } from "../../knowledge-item-create/components/knowledge-item-type-selector";
import { buttonVariants } from "node_modules/@medusajs/ui/dist/esm/components/button";
import { useTranslation } from "react-i18next";

export function KnowledgeItemContentActionType(props: {
  item: KnowledgeItemResponseDto;
}) {
  const { t } = useTranslation();
  const { item } = props;
  const type = props.item.type as KnowledgeItemType;

  if (type === "URL") {
    return (
      <a
        className={buttonVariants({
          variant: "secondary",
        })}
        href={item.content}
        target="_blank"
        rel="noreferrer"
      >
        <Eye />
        {t("actions.view")}
      </a>
    );
  } else if (type === "FILE") {
    return (
      <a
        className={buttonVariants({
          variant: "secondary",
        })}
        href={item.attachment?.cdnUrl}
        target="_blank"
        rel="noreferrer"
      >
        <ArrowDownTray />
        {t("actions.download")}
      </a>
    );
  }
  return null;
}
