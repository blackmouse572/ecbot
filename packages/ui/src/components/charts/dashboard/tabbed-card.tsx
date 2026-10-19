import { Container, Heading, Tabs } from "@medusajs/ui";
import type { FC, ReactNode } from "react";

type TabbedCardProps = {
  title: string;
  tabs: { value: string; label: string; content: ReactNode }[];
};

/** One card holding several views of the same kind, one shown at a time. */
export const TabbedCard: FC<TabbedCardProps> = ({ title, tabs }) => (
  <Container className="flex flex-col gap-y-3">
    <Tabs defaultValue={tabs[0]?.value}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading level="h2">{title}</Heading>
        <Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Trigger key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>
      {tabs.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value} className="pt-3">
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs>
  </Container>
);
