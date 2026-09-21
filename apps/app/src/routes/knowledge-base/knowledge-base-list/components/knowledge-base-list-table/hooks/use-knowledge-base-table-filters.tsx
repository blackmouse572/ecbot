import type { Filter } from "@/components/table/data-table";
import {
  KB_TYPE_CONFIG,
  KB_STATUS_CONFIG,
  KB_TYPE_ICON_COMPONENTS,
  KB_STATUS_ICON_COMPONENTS,
} from "@/routes/knowledge-base/constants";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface UseKnowledgeBaseTableFiltersProps {
  tags?: string[];
}

export function useKnowledgeBaseTableFilters({
  tags = [],
}: UseKnowledgeBaseTableFiltersProps): Filter[] {
  const { t } = useTranslation();

  const filters = useMemo<Filter[]>(
    () => [
      {
        key: "type",
        label: t("fields.type"),
        type: "select",
        options: Object.keys(KB_TYPE_CONFIG).map((typeKey) => ({
          label: KB_TYPE_CONFIG[typeKey].label,
          value: typeKey,
          renderItem: () => {
            const IconComponent =
              KB_TYPE_ICON_COMPONENTS[
                KB_TYPE_CONFIG[typeKey]
                  .icon as keyof typeof KB_TYPE_ICON_COMPONENTS
              ];
            return (
              <div className="flex gap-2 items-center">
                <IconComponent
                  className={`size-4 text-ui-tag-${KB_TYPE_CONFIG[typeKey].color}-icon`}
                />
                <span>{KB_TYPE_CONFIG[typeKey].label}</span>
              </div>
            );
          },
        })),
        multiple: true,
        searchable: true,
      },
      {
        key: "status",
        label: t("fields.status"),
        type: "select",
        options: Object.keys(KB_STATUS_CONFIG).map((statusKey) => ({
          label: KB_STATUS_CONFIG[statusKey].label,
          value: statusKey,
          renderItem: () => {
            const IconComponent =
              KB_STATUS_ICON_COMPONENTS[
                KB_STATUS_CONFIG[statusKey]
                  .icon as keyof typeof KB_STATUS_ICON_COMPONENTS
              ];
            return (
              <div className="flex gap-2 items-center">
                <IconComponent
                  className={`size-4 text-ui-tag-${KB_STATUS_CONFIG[statusKey].color}-icon`}
                />
                <span>{KB_STATUS_CONFIG[statusKey].label}</span>
              </div>
            );
          },
        })),
        multiple: true,
        searchable: true,
      },
      {
        key: "tags",
        label: t("knowledgeBase.tag.title"),
        type: "select",
        options: tags.map((tag) => ({
          label: tag,
          value: tag,
        })),
        multiple: true,
        searchable: true,
      },
    ],
    [t, tags],
  );

  return filters;
}
