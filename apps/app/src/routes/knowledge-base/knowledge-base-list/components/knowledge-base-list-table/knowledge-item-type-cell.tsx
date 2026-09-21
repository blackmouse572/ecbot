import {
  KB_TYPE_CONFIG,
  KB_TYPE_ICON_COMPONENTS,
} from "@/routes/knowledge-base/constants";
import { Badge, clx } from "@medusajs/ui";
import {} from "@repo/ui/utils";

export function KnowledgeItemTypeCell({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const typeConfig = KB_TYPE_CONFIG[type as keyof typeof KB_TYPE_CONFIG];
  const IconComponent =
    KB_TYPE_ICON_COMPONENTS[
      typeConfig?.icon as keyof typeof KB_TYPE_ICON_COMPONENTS
    ];

  const typeDisplay = typeConfig ? (
    <Badge
      color={typeConfig.color}
      size="small"
      className={clx(className, "rounded-full")}
    >
      <div className="flex items-center gap-1">
        {IconComponent && <IconComponent size={14} />}
        {typeConfig.label}
      </div>
    </Badge>
  ) : (
    type
  );

  return typeDisplay;
}
