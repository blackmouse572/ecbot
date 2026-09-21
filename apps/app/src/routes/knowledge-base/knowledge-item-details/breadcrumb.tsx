import { type UIMatch } from "react-router-dom";
import { useKnowledgeItem } from "@/hooks/api/knowledge-base";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { Helmet } from "react-helmet-async";
type KnowledgeItemDetailsBreadcrumbProps = UIMatch<KnowledgeItemResponseDto>;
export function KnowledgeItemDetailsBreadcrumb(
  props: KnowledgeItemDetailsBreadcrumbProps,
) {
  const { params } = props;
  const { id, knowledgeBaseId } = params;

  const { item } = useKnowledgeItem(knowledgeBaseId || "", id || "");

  return (
    <span>
      {item?.title}
      <Helmet>
        <title>{item?.title} - Ecbot</title>
      </Helmet>
    </span>
  );
}
