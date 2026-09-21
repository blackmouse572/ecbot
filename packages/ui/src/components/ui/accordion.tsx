import { Plus } from "@medusajs/icons";
import { clx, IconButton } from "@medusajs/ui";
import { Accordion as RadixAccordion } from "radix-ui";
import * as React from "react";

/**
 * This component is based on the [Radix UI Accordion](https://radix-ui.com/primitives/docs/components/accordion) primitves.
 */
const Root = (
  props: React.ComponentPropsWithoutRef<typeof RadixAccordion.Root>,
) => {
  return <RadixAccordion.Root {...props} />;
};
Root.displayName = "Accordion";

const Item = React.forwardRef<
  React.ComponentRef<typeof RadixAccordion.Item>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadixAccordion.Item
      ref={ref}
      className={clx(
        "border-ui-border-base border-b last-of-type:border-b-0",
        className,
      )}
      {...props}
    />
  );
});
Item.displayName = "Accordion.Item";

type HeaderProps = React.ComponentPropsWithoutRef<
  typeof RadixAccordion.Header
> & {
  trigger?: React.ReactNode;
};

const Header = React.forwardRef<
  React.ElementRef<typeof RadixAccordion.Header>,
  HeaderProps
>(({ className, trigger, children, ...props }: HeaderProps, ref) => {
  return (
    <RadixAccordion.Header
      ref={ref}
      className={clx(
        "h3-core text-ui-fg-base group flex w-full flex-1 items-center gap-4 px-6",
        className,
      )}
      {...props}
    >
      {children}
      <RadixAccordion.Trigger asChild className="ml-auto">
        {trigger || (
          <IconButton variant="transparent">
            <Plus className="transform transition-transform group-data-[state=open]:rotate-45" />
          </IconButton>
        )}
      </RadixAccordion.Trigger>
    </RadixAccordion.Header>
  );
});
Header.displayName = "Accordion.Header";

const Content = React.forwardRef<
  React.ElementRef<typeof RadixAccordion.Content>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Content>
>(({ className, ...props }, ref) => {
  return (
    <RadixAccordion.Content
      ref={ref}
      className={clx(
        "overflow-hidden",
        "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down pl-[88px] pr-6",
        className,
      )}
      {...props}
    />
  );
});
Content.displayName = "Accordion.Content";

const Accordion = Object.assign(Root, {
  Item,
  Header,
  Content,
});

export { Accordion };
