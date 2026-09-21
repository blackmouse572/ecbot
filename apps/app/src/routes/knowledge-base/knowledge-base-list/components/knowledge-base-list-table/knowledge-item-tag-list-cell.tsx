import { BadgeListSummary } from "@repo/ui/common-components";

interface KnowledgeItemTagListCellProps {
  tags?: string[];
}

export function KnowledgeItemTagListCell({
  tags = [],
}: KnowledgeItemTagListCellProps) {
  return <BadgeListSummary rounded list={tags} />;
}
