import {
  MarketingPermissionLabel,
  MarketingStageBadge,
} from "@/components/customer-marketing";
import {
  useCustomerMarketing,
  useCustomerMarketingEvents,
  type MarketingEventGetResponseDto,
} from "@/hooks/api/customer-marketing";
import { Button, Heading, Text } from "@medusajs/ui";
import { Skeleton } from "@repo/ui/common-components";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { EVENT_LIST_CLASS, LATEST_EVENT_COUNT } from "./constants";
import { MarketingEditDrawer } from "./marketing-edit-drawer";
import { MarketingEventItem } from "./marketing-event-item";
import { MarketingFirstSource } from "./marketing-first-source";
import { MarketingFreeWindows } from "./marketing-free-windows";
import { MarketingLayerRow } from "./marketing-layer-row";
import { MarketingProductReactions } from "./marketing-product-reactions";
import { MarketingTimelineDrawer } from "./marketing-timeline-drawer";

type Props = {
  customerId: string;
  customerName?: string | null;
  conversationId?: string;
  onViewMessage?: (messageId: string) => void;
};

const KEY = "conversations.customer.panel.marketing";

/** "Tiếp thị": the customer's labels, why each is set, and what changed. */
export const MarketingSection: FC<Props> = ({
  customerId,
  customerName,
  conversationId,
  onViewMessage,
}) => {
  const { t } = useTranslation();
  const { marketing, isPending, isError } = useCustomerMarketing(customerId);
  const timeline = useCustomerMarketingEvents(customerId);
  const [editOpen, setEditOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const viewMessageFor = (event: MarketingEventGetResponseDto) =>
    onViewMessage && conversationId && event.conversationId === conversationId
      ? onViewMessage
      : undefined;

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-center justify-between">
        <Heading level="h3">{t(`${KEY}.title`)}</Heading>
        {marketing && (
          <Button
            size="small"
            variant="secondary"
            onClick={() => setEditOpen(true)}
          >
            {t(`${KEY}.editLabels`)}
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="flex flex-col gap-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ) : isError || !marketing ? (
        <Text size="small" className="text-ui-fg-error">
          {t("general.loadFailed")}
        </Text>
      ) : (
        <>
          <div className="bg-ui-bg-base shadow-borders-base divide-ui-border-base flex flex-col divide-y rounded-lg">
            <MarketingLayerRow
              label={t(`${KEY}.stage`)}
              event={marketing.stageEvent}
            >
              <MarketingStageBadge
                stage={marketing.stage}
                dormant={marketing.dormant}
              />
            </MarketingLayerRow>
            {marketing.reactions.length > 0 && (
              <MarketingLayerRow
                label={t(`${KEY}.productGroups.title`)}
                event={null}
              >
                <MarketingProductReactions reactions={marketing.reactions} />
              </MarketingLayerRow>
            )}
            <MarketingLayerRow
              label={t(`${KEY}.permission`)}
              event={
                marketing.hostile
                  ? marketing.hostileEvent
                  : marketing.permissionEvent
              }
            >
              <MarketingPermissionLabel
                permission={marketing.permission}
                permissionUntil={marketing.permissionUntil}
                hostile={marketing.hostile}
              />
            </MarketingLayerRow>
          </div>

          {marketing.freeWindows.length > 0 && (
            <div className="flex flex-col gap-y-1">
              <Text size="small" weight="plus">
                {t(`${KEY}.freeWindow.title`)}
              </Text>
              <MarketingFreeWindows windows={marketing.freeWindows} />
            </div>
          )}

          <div className="flex flex-col gap-y-1">
            <Text size="small" weight="plus">
              {t(`${KEY}.firstSource.title`)}
            </Text>
            <MarketingFirstSource source={marketing.firstSource} />
          </div>

          <div className="flex flex-col gap-y-2">
            <div className="flex items-center justify-between">
              <Text size="small" weight="plus">
                {t(`${KEY}.timeline.title`)}
              </Text>
              {timeline.events.length > 0 && (
                <Button
                  size="small"
                  variant="transparent"
                  className="text-ui-fg-interactive"
                  onClick={() => setTimelineOpen(true)}
                >
                  {t(`${KEY}.timeline.viewAll`)}
                </Button>
              )}
            </div>
            {timeline.isPending ? (
              <Skeleton className="h-12 w-full" />
            ) : timeline.isError ? (
              <Text size="small" className="text-ui-fg-error">
                {t("general.loadFailed")}
              </Text>
            ) : timeline.events.length === 0 ? (
              <Text size="small" className="text-ui-fg-muted">
                {t(`${KEY}.timeline.empty`)}
              </Text>
            ) : (
              <ul className={EVENT_LIST_CLASS}>
                {timeline.events.slice(0, LATEST_EVENT_COUNT).map((event) => (
                  <MarketingEventItem
                    key={event.id}
                    event={event}
                    onViewMessage={viewMessageFor(event)}
                  />
                ))}
              </ul>
            )}
          </div>

          <MarketingEditDrawer
            customerId={customerId}
            customerName={customerName}
            marketing={marketing}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <MarketingTimelineDrawer
            customerId={customerId}
            customerName={customerName}
            open={timelineOpen}
            onOpenChange={setTimelineOpen}
            conversationId={conversationId}
            onViewMessage={onViewMessage}
          />
        </>
      )}
    </div>
  );
};
