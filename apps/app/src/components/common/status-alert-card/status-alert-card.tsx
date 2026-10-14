import { Container, Heading, Text } from "@medusajs/ui";
import type { ReactNode } from "react";

type StatusAlertCardProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Right-aligned call to action, e.g. a link. */
  action?: ReactNode;
};

/** An icon, a heading and a muted line, used for account and usage status. */
export const StatusAlertCard = ({
  icon,
  title,
  description,
  action,
}: StatusAlertCardProps) => (
  <Container className="flex items-start gap-4">
    <span className="flex-shrink-0 py-1">{icon}</span>
    <div className="min-w-0 flex-1">
      <Heading level="h3">{title}</Heading>
      {description && (
        <Text size="xsmall" className="text-ui-fg-muted">
          {description}
        </Text>
      )}
    </div>
    {action && <div className="shrink-0 py-1">{action}</div>}
  </Container>
);
