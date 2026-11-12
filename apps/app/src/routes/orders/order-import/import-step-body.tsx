import { RouteFocusModal } from "@/components/modals";
import { Heading, Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";

/** The import's step body: a heading over a 760px column, as in frame 14e. */
export const ImportStepBody: FC<{
  title: string;
  description: string;
  children: ReactNode;
}> = ({ title, description, children }) => (
  <RouteFocusModal.Body className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-10">
    <div className="flex w-full max-w-[760px] flex-col gap-y-5">
      <div className="flex flex-col gap-y-1">
        <Heading>{title}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {description}
        </Text>
      </div>
      {children}
    </div>
  </RouteFocusModal.Body>
);
