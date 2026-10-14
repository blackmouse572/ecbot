import { Heading, Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";

type ChatbotSectionHeaderProps = {
  title: ReactNode;
  /** What the card controls, in the owner's words. */
  description?: ReactNode;
  /** At most one text button, then an ActionMenu, on the right. */
  actions?: ReactNode;
};

/** The one header every card on the chatbot page uses. */
export const ChatbotSectionHeader: FC<ChatbotSectionHeaderProps> = ({
  title,
  description,
  actions,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
    <div className="flex min-w-0 flex-1 flex-col gap-y-1">
      <Heading level="h2">{title}</Heading>
      {description && (
        <Text size="small" className="text-ui-fg-subtle">
          {description}
        </Text>
      )}
    </div>
    {actions && <div className="flex items-center gap-x-2">{actions}</div>}
  </div>
);
