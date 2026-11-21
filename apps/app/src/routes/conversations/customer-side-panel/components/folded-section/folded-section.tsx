import { ChevronDownMini } from "@medusajs/icons";
import { Accordion } from "@repo/ui/components";
import type { FC, ReactNode } from "react";

interface Props {
  value: string;
  title: ReactNode;
  children: ReactNode;
}

// A customer panel section that stays folded until the operator opens it.
// Lives inside an Accordion root that owns which sections are open.
export const FoldedSection: FC<Props> = ({ value, title, children }) => (
  <Accordion.Item value={value}>
    <Accordion.Header
      className="px-4"
      trigger={
        <button
          type="button"
          className="txt-compact-small-plus text-ui-fg-base hover:text-ui-fg-subtle focus-visible:shadow-borders-focus group/fold flex w-full items-center justify-between rounded-md py-3 text-left outline-none transition-colors"
        >
          {title}
          <ChevronDownMini className="text-ui-fg-muted transition-transform duration-200 group-data-[state=open]/fold:rotate-180" />
        </button>
      }
    />
    <Accordion.Content className="!pl-4 !pr-4 pb-4">
      {children}
    </Accordion.Content>
  </Accordion.Item>
);
