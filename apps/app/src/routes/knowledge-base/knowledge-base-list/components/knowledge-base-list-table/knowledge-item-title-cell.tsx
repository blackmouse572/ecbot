import { KnowledgeItemTypeIcon } from "./knowledge-item-type-icon";

export function KnowledgeItemTitleCell({
  title,
  type,
  mime,
}: {
  title: string;
  type: string;
  /** Mime of the uploaded file, for FILE and MEDIA items. */
  mime?: string;
}) {
  return (
    <div className="flex items-center min-w-0 gap-2 ">
      <KnowledgeItemTypeIcon type={type} mime={mime} />
      <span className="truncate">{title}</span>
    </div>
  );
}
