import { useCustomerMarketingEvents } from "@/hooks/api/customer-marketing";
import { Button, Drawer, Text } from "@medusajs/ui";
import { ListSkeleton } from "@repo/ui/common-components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { EVENT_LIST_CLASS } from "./constants";
import { MarketingEventItem } from "./marketing-event-item";

type Props = {
  customerId: string;
  customerName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Messages of this conversation can be jumped to from the timeline.
  conversationId?: string;
  onViewMessage?: (messageId: string) => void;
};

const KEY = "conversations.customer.panel.marketing.timeline";

/** Every label change of the customer, newest first. */
export const MarketingTimelineDrawer: FC<Props> = ({
  customerId,
  customerName,
  open,
  onOpenChange,
  conversationId,
  onViewMessage,
}) => {
  const { t } = useTranslation();

  const {
    events,
    total,
    isPending,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCustomerMarketingEvents(customerId, { enabled: open });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t(`${KEY}.title`)}</Drawer.Title>
          <Drawer.Description>
            {customerName
              ? t(`${KEY}.descriptionNamed`, { name: customerName })
              : t(`${KEY}.description`)}
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="flex flex-1 flex-col overflow-y-auto">
          {isPending ? (
            <ListSkeleton label={t("general.loading")} rowCount={4} />
          ) : isError ? (
            <div className="flex flex-col items-start gap-y-2">
              <Text size="small" className="text-ui-fg-error">
                {t("general.loadFailed")}
              </Text>
              <Button
                size="small"
                variant="secondary"
                onClick={() => refetch()}
              >
                {t("actions.tryAgain")}
              </Button>
            </div>
          ) : events.length === 0 ? (
            <Text size="small" className="text-ui-fg-muted">
              {t(`${KEY}.empty`)}
            </Text>
          ) : (
            <ul className={EVENT_LIST_CLASS}>
              {events.map((event) => (
                <MarketingEventItem
                  key={event.id}
                  event={event}
                  onViewMessage={
                    onViewMessage &&
                    conversationId &&
                    event.conversationId === conversationId
                      ? (messageId) => {
                          onOpenChange(false);
                          onViewMessage(messageId);
                        }
                      : undefined
                  }
                />
              ))}
            </ul>
          )}
        </Drawer.Body>
        <Drawer.Footer className="justify-between">
          <Text size="small" className="text-ui-fg-muted">
            {t(`${KEY}.count`, { count: total })}
          </Text>
          <Button
            size="small"
            variant="secondary"
            disabled={!hasNextPage}
            isLoading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {t(`${KEY}.loadMore`)}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
};
