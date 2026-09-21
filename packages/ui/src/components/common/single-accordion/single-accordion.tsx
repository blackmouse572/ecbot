import { clx } from "@medusajs/ui";
import { Accordion } from "../../ui";

const Root = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Accordion>) => {
  return (
    <Accordion
      className={clx(
        "bg-ui-bg-component shadow-elevation-card-rest rounded-lg py-1.5",
        className,
      )}
      {...props}
    />
  );
};
const Header = Accordion.Header;
const Item = Accordion.Item;
const Content = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Accordion.Content>) => {
  return (
    <Accordion.Content
      className={clx("px-6 py-6 border-t border-dashed mt-1.5", className)}
      {...props}
    />
  );
};

// Explicit shape (rather than relying on inference) so the declaration
// emitter can print `typeof Accordion.X` verbatim instead of trying to
// serialize Item/Header's Radix-derived generic, which isn't portable
// outside this file's own import graph and trips TS2742.
type SingleAccordionType = {
  Root: typeof Root;
  Item: typeof Accordion.Item;
  Header: typeof Accordion.Header;
  Content: typeof Content;
};

export const SingleAccordion: SingleAccordionType = {
  Root,
  Item,
  Header,
  Content,
};
