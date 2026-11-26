import { Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";

type SendStepProps = {
  step: number;
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

/** One numbered section of the send drawer: Gửi cho ai, Tin nhắn, Cách gửi. */
export const SendStep: FC<SendStepProps> = ({
  step,
  title,
  action,
  children,
}) => (
  <section className="flex flex-col gap-y-3">
    <div className="flex items-center justify-between gap-x-2">
      <div className="flex items-center gap-x-2">
        <span className="bg-ui-bg-component text-ui-fg-subtle shadow-borders-base txt-compact-xsmall-plus flex size-5 items-center justify-center rounded-full tabular-nums">
          {step}
        </span>
        <Text size="small" weight="plus" leading="compact">
          {title}
        </Text>
      </div>
      {action}
    </div>
    {children}
  </section>
);
