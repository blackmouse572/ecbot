import { useStackedModal } from "@/components/modals/stacked-modal-provider";
import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import type { MarketingOverviewTodoDto } from "@/hooks/api/marketing-overview";
import {
  useMarketingAudiencePreview,
  type MarketingAudiencePreviewResponseDto,
} from "@/hooks/api/marketing-sends";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import { Button, Skeleton, Text } from "@medusajs/ui";
import { useState, type FC } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { MarketingSendFormData } from "../../schemas";
import {
  SEND_CUSTOMERS_DRAWER,
  SendCustomersDrawer,
} from "./send-customers-drawer";
import { SendStep } from "./send-step";

type Platform =
  MarketingAudiencePreviewResponseDto["channels"][number]["platform"];

type SendAudienceProps = {
  form: UseFormReturn<MarketingSendFormData>;
  preset: MarketingOverviewTodoDto["key"];
};

/**
 * Gửi cho ai: how many customers the stage reaches now, by channel. A
 * channel opens its customers, where the shop can untick some.
 */
export const SendAudience: FC<SendAudienceProps> = ({ form, preset }) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const { workspaceSlug } = useWorkspaceParams();
  const { setIsOpen } = useStackedModal();
  const [platform, setPlatform] = useState<Platform>();

  const excluded = useWatch({
    control: form.control,
    name: "excludedCustomerIds",
  });

  const setExcluded = (ids: string[]) =>
    form.setValue("excludedCustomerIds", ids, {
      shouldDirty: true,
      shouldValidate: true,
    });

  const { preview, isLoading, isError } = useMarketingAudiencePreview(
    workspaceSlug,
    { preset, excludedCustomerIds: excluded },
  );

  const left = preview?.excluded.reasons.filter((r) => r.count > 0) ?? [];

  const open = (value: Platform) => {
    setPlatform(value);
    setIsOpen(SEND_CUSTOMERS_DRAWER, true);
  };

  return (
    <SendStep step={1} title={t("marketing.send.audience.title")}>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : isError || !preview ? (
        <Text size="small" className="text-ui-fg-error">
          {t("marketing.send.audience.error")}
        </Text>
      ) : (
        <>
          <Text size="base" weight="plus" data-testid="send-audience-count">
            {t(`marketing.overview.todos.${preset}.title`, {
              value: f.number(preview.count),
            })}
          </Text>
          {preview.channels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {preview.channels.map((channel) => (
                <button
                  type="button"
                  key={channel.platform}
                  onClick={() => open(channel.platform)}
                  className="bg-ui-bg-component shadow-borders-base txt-compact-small hover:bg-ui-bg-component-hover focus-visible:shadow-borders-interactive-with-focus flex items-center gap-x-1.5 rounded-md px-2 py-1 outline-none transition-colors"
                >
                  <PlatformIcon type={channel.platform} />
                  {channelOf(channel.platform).label}
                  <span className="text-ui-fg-subtle tabular-nums">
                    {f.number(channel.count)}
                  </span>
                </button>
              ))}
            </div>
          )}
          {excluded.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2">
              <Text size="small" className="text-ui-fg-subtle">
                {t("marketing.send.audience.unticked", {
                  count: excluded.length,
                })}
              </Text>
              <Button
                type="button"
                size="small"
                variant="transparent"
                onClick={() => setExcluded([])}
              >
                {t("marketing.send.audience.tickAll")}
              </Button>
            </div>
          )}
          {left.length > 0 && (
            <Text size="small" className="text-ui-fg-subtle">
              {t("marketing.send.audience.excluded", {
                value: f.number(preview.excluded.total),
                reasons: left
                  .map(
                    (r) =>
                      `${f.number(r.count)} ${t(`marketing.exclusion.${r.reason}`)}`,
                  )
                  .join(", "),
              })}
            </Text>
          )}
          <SendCustomersDrawer
            preset={preset}
            platform={platform}
            channels={preview.channels}
            excluded={excluded}
            onExcludedChange={setExcluded}
          />
        </>
      )}
    </SendStep>
  );
};
