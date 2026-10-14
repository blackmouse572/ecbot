import {
  KB_TYPE_CONFIG,
  KB_TYPE_ICON_COMPONENTS,
} from "@/routes/knowledge-base/constants";
import { Tooltip } from "@medusajs/ui";
import { FileType, getFileType } from "@repo/ui/components/ui/file-type";

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
  const typeConfig = KB_TYPE_CONFIG[type as keyof typeof KB_TYPE_CONFIG];
  const IconComponent =
    KB_TYPE_ICON_COMPONENTS[
      typeConfig?.icon as keyof typeof KB_TYPE_ICON_COMPONENTS
    ];

  return (
    <div className="flex items-center min-w-0 gap-2 ">
      {mime ? (
        <Tooltip content={typeConfig?.label}>
          <FileType type={getFileType(mime)} size="mini" aria-hidden />
        </Tooltip>
      ) : (
        IconComponent && (
          <Tooltip content={typeConfig?.label}>
            <IconComponent size={16} className="flex-shrink-0 text-grey-40" />
          </Tooltip>
        )
      )}
      <span className="truncate">{title}</span>
    </div>
  );
}
