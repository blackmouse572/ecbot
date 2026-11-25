import type { CustomerMarketingFirstSourceResponseDto } from "@repo/client";
import { useDate } from "@/hooks/use-date";
import { Tooltip } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type MoreSourcesProps = {
  /** Every link the customer arrived through, oldest first, the first one included. */
  sources: CustomerMarketingFirstSourceResponseDto[];
};

/** "+2" after Đến từ: the later links, listed with their dates on hover. */
export const MoreSources: FC<MoreSourcesProps> = ({ sources }) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();
  const more = sources.length - 1;

  if (more < 1) return null;

  return (
    <Tooltip
      content={
        <ul className="flex flex-col gap-y-1.5">
          {sources.map((source, index) => (
            <li
              key={`${source.sourceId}-${source.codeName ?? ""}`}
              className="flex flex-col"
            >
              <span>
                {source.codeName
                  ? `${source.sourceName} (${source.codeName})`
                  : source.sourceName}
              </span>
              <span className="text-ui-fg-muted">
                {index === 0
                  ? t("customers.detail.firstArrival", {
                      date: getFullDate(new Date(source.at)),
                    })
                  : getFullDate(new Date(source.at))}
              </span>
            </li>
          ))}
        </ul>
      }
    >
      <button
        type="button"
        aria-label={t("customers.detail.moreSources", { count: more })}
        className="bg-ui-tag-blue-bg text-ui-tag-blue-text txt-compact-xsmall-plus rounded-md px-1.5"
      >
        +{more}
      </button>
    </Tooltip>
  );
};
