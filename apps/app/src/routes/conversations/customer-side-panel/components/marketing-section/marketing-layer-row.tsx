import {
  useMarketingDate,
  useMarketingEventText,
} from "@/components/customer-marketing";
import type { MarketingEventGetResponseDto } from "@/hooks/api/customer-marketing";
import { Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";

/** One label layer: its value, and the reason it holds that value. */
export const MarketingLayerRow: FC<{
  label: string;
  event: MarketingEventGetResponseDto | null;
  children: ReactNode;
}> = ({ label, event, children }) => {
  const toText = useMarketingEventText();
  const formatDate = useMarketingDate();
  const text = event ? toText(event) : null;

  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-x-2 px-3 py-2.5">
      <Text size="xsmall" className="text-ui-fg-muted leading-5">
        {label}
      </Text>
      <div className="flex min-w-0 flex-col gap-y-1">
        {children}
        {event && text && (
          <div className="flex flex-col">
            <Text size="xsmall" className="text-ui-fg-subtle">
              {text.reason ?? text.title}
            </Text>
            <Text size="xsmall" className="text-ui-fg-muted">
              {formatDate(event.createdAt)} · {text.actor}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};
