import { useMe } from "@/hooks/api";
import { useDate } from "@/hooks/use-date";
import { Avatar, clx } from "@medusajs/ui";
import type { UserProfileResponseDto } from "@repo/client";
import type React from "react";
import type { LinkProps } from "react-router-dom";

const Root = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div {...props} className={clx("flex gap-8 cursor-default", className)}>
      {children}
    </div>
  );
};

const Body = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div {...props} className={clx("flex flex-col gap-1", className)}>
      {children}
    </div>
  );
};

const Title = ({
  children,
  className,
  ...props
}: React.ComponentProps<"h3">) => {
  return (
    <h3 {...props} className={clx("text-sm text-ui-fg-subtle", className)}>
      {children}
    </h3>
  );
};
const Name = ({
  className,
  user,
  ...props
}: React.ComponentProps<"span"> & {
  user: Pick<UserProfileResponseDto, "id" | "name" | "email" | "photo">;
}) => {
  const { user: me } = useMe();
  return (
    <span
      {...props}
      className={clx("txt-compact-small text-ui-fg-base", className)}
    >
      {me?.id === user.id ? "You" : user.name || user.email}
    </span>
  );
};

const Link = ({ children, className, ...props }: LinkProps) => {
  return (
    <Link
      {...props}
      className={clx(
        "text-ui-fg-interactive hover:text-ui-fg-interactive-hover hover:underline transition-colors",
        className,
      )}
    >
      {children}
    </Link>
  );
};

const Description = ({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) => {
  return (
    <p {...props} className={clx("text-ui-fg-subtle", className)}>
      {children}
    </p>
  );
};

const Date = ({
  children,
  className,
  ...props
}: React.ComponentProps<"p"> & {
  children: Date;
}) => {
  const { getRelativeDateOrFullDate } = useDate();
  return (
    <p {...props} className={clx("text-ui-fg-subtle text-xs", className)}>
      {getRelativeDateOrFullDate(children as Date)}
    </p>
  );
};

const ByAvatar = Avatar;

const Action = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div {...props} className={clx("ml-4 space-x-2", className)}>
      {children}
    </div>
  );
};

const ActivityItem = Object.assign(Root, {
  Title,
  Link,
  Description,
  Date,
  ByAvatar,
  Action,
  Body,
  Name,
});

export { ActivityItem };
