import {
  KB_TYPE_CONFIG,
  KB_TYPE_ICON_COMPONENTS,
} from "@/routes/knowledge-base/constants";
import { Tooltip } from "@medusajs/ui";
import { FileType, getFileType } from "@repo/ui/components/ui/file-type";

/**
 * A knowledge item's icon: the file's own type (PDF, image, ...) when it has
 * an uploaded file, else the item type's icon. The tooltip names the type.
 */
export function KnowledgeItemTypeIcon({
  type,
  mime,
}: {
  type: string;
  /** Mime of the uploaded file, for FILE and MEDIA items. */
  mime?: string;
}) {
  const typeConfig = KB_TYPE_CONFIG[type as keyof typeof KB_TYPE_CONFIG];
  const IconComponent =
    KB_TYPE_ICON_COMPONENTS[
      typeConfig?.icon as keyof typeof KB_TYPE_ICON_COMPONENTS
    ];

  if (mime) {
    return (
      <Tooltip content={typeConfig?.label}>
        <FileType type={getFileType(mime)} size="mini" aria-hidden />
      </Tooltip>
    );
  }
  return IconComponent ? (
    <Tooltip content={typeConfig?.label}>
      {/* 18px, the width of the mini file type icon, so titles align. */}
      <IconComponent size={18} className="flex-shrink-0 text-grey-40" />
    </Tooltip>
  ) : null;
}
