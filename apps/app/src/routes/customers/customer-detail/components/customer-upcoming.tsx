import { useMarketingDate } from "@/components/customer-marketing";
import {
  useCustomerMarketing,
  useRemoveProductReaction,
} from "@/hooks/api/customer-marketing";
import { useCancelFollowup, useCustomerFollowups } from "@/hooks/api/followups";
import { BellAlert, PauseSolid } from "@medusajs/icons";
import { Button, Container, Heading, Text } from "@medusajs/ui";
import { useAbility } from "@repo/auth";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ToneIcon, type Tone } from "./tone-icon";

const KEY = "customers.detail.upcoming";

/**
 * What will happen next without anyone doing it: reminders the bot will
 * send, and product groups paused for now. Hidden when there is nothing.
 */
export const CustomerUpcoming: FC<{ customerId: string }> = ({
  customerId,
}) => {
  const { t } = useTranslation();
  const ability = useAbility();
  const formatDate = useMarketingDate();
  const { followups } = useCustomerFollowups(
    ability.can("read", "CONVERSATION") ? customerId : "",
  );
  const { marketing } = useCustomerMarketing(customerId);
  const cancel = useCancelFollowup();
  const resume = useRemoveProductReaction(customerId);
  const canEditCustomer = ability.can("update", "CUSTOMER");
  const reactions = marketing?.reactions ?? [];
  const count = followups.length + reactions.length;

  if (count === 0) return null;

  return (
    <Container className="flex flex-col gap-y-3 px-6 py-4">
      <div className="flex items-center justify-between gap-x-2">
        <Heading level="h2">{t(`${KEY}.title`)}</Heading>
        <Text size="small" className="text-ui-fg-muted">
          {t(`${KEY}.count`, { count })}
        </Text>
      </div>
      <ul className="flex flex-col gap-y-2">
        {followups.map((followup) => (
          <Item
            key={followup.followupId}
            tone="orange"
            icon={<BellAlert />}
            title={t(`${KEY}.followup`, {
              date: formatDate(followup.scheduledAt),
            })}
            hint={followup.reason}
            action={
              <Button
                size="small"
                variant="transparent"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(followup.followupId)}
              >
                {t(`${KEY}.cancel`)}
              </Button>
            }
          />
        ))}
        {reactions.map((reaction) => (
          <Item
            key={reaction.productGroupId}
            tone="red"
            icon={<PauseSolid />}
            title={t(`${KEY}.paused`, {
              group: reaction.productGroupName,
              date: formatDate(reaction.until),
            })}
            hint={
              reaction.reason
                ? t(`${KEY}.pausedHint`, { reason: reaction.reason })
                : undefined
            }
            action={
              canEditCustomer && (
                <Button
                  size="small"
                  variant="transparent"
                  disabled={resume.isPending}
                  onClick={() => resume.mutate(reaction.productGroupId)}
                >
                  {t(`${KEY}.resume`)}
                </Button>
              )
            }
          />
        ))}
      </ul>
    </Container>
  );
};

const Item: FC<{
  tone: Tone;
  icon: ReactNode;
  title: string;
  hint?: string | null;
  action?: ReactNode;
}> = ({ tone, icon, title, hint, action }) => (
  <li className="bg-ui-bg-subtle border-ui-border-base flex items-center gap-x-3 rounded-lg border px-3 py-2.5">
    <ToneIcon tone={tone}>{icon}</ToneIcon>
    <div className="flex min-w-0 flex-1 flex-col">
      <Text size="small" weight="plus">
        {title}
      </Text>
      {hint && (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {hint}
        </Text>
      )}
    </div>
    {action}
  </li>
);
