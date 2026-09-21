import { Button, clx, Divider } from "@medusajs/ui";

type LoadMoreDividerProps = React.HTMLAttributes<HTMLDivElement> & {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
};

const TRIGGER_BUTTON_CLASSNAME = "text-nowrap min-w-[120px] text-ui-fg-muted";

export function LoadMoreDivider({
  children: _children,
  className,
  onClick,
  hasNextPage = false,
  isFetchingNextPage = false,
  ...props
}: LoadMoreDividerProps) {
  const children =
    typeof _children === "string" ? (
      <Button
        size="small"
        variant="transparent"
        className={TRIGGER_BUTTON_CLASSNAME}
        disabled={!hasNextPage}
        isLoading={isFetchingNextPage}
      >
        {_children}
      </Button>
    ) : (
      _children
    );
  return (
    <div
      className={clx(
        "flex items-center justify-center cursor-default",
        className,
      )}
      {...props}
      onClick={hasNextPage ? onClick : undefined}
    >
      <Divider />
      {children}
      <Divider />
    </div>
  );
}
