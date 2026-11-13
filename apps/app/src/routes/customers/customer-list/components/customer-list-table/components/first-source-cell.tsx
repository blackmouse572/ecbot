import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import type { CustomerGetResponseDto } from "@/hooks/api";
import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  source: NonNullable<CustomerGetResponseDto["marketing"]>["firstSource"];
};

/** Nguồn đầu tiên: channel logo, then "source, code". */
export const FirstSourceCell: FC<Props> = ({ source }) => {
  const { t } = useTranslation();

  if (!source) {
    return (
      <Text size="small" className="text-ui-fg-muted whitespace-nowrap">
        {t("customerMarketing.firstSource.direct")}
      </Text>
    );
  }

  const text = source.codeName
    ? `${source.sourceName}, ${source.codeName}`
    : source.sourceName;

  return (
    <div className="flex min-w-0 items-center gap-x-2">
      <PlatformIcon type={source.channel} size={16} />
      <Text size="small" className="truncate" title={text}>
        {text}
      </Text>
    </div>
  );
};
