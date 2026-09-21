import { clx } from "@medusajs/ui";
import { Children, type ComponentPropsWithoutRef } from "react";
import { Outlet } from "react-router-dom";
import type { PageProps } from "./type";

interface TwoColumnPageProps<TData> extends PageProps<TData> {
  sidebarProps?: {
    className?: string;
  };
}

const Root = <TData,>({
  children,
  /**
   * Data to be passed to widgets, JSON view, and Metadata view.
   */
  hasOutlet = true,
  sidebarProps = {},
}: TwoColumnPageProps<TData>) => {
  const childrenArray = Children.toArray(children);

  if (childrenArray.length !== 2) {
    throw new Error("TwoColumnPage expects exactly two children");
  }

  const [main, sidebar] = childrenArray;

  return (
    <div className="flex w-full flex-col gap-y-3">
      <div className="flex w-full flex-col items-start gap-x-4 gap-y-3 xl:grid xl:grid-cols-[minmax(0,_1fr)_440px]">
        <div className="flex w-full min-w-0 flex-col gap-y-3">{main}</div>
        <div
          className={clx(
            "flex w-full flex-col gap-y-3 xl:mt-0",
            sidebarProps.className,
          )}
          {...sidebarProps}
        >
          {sidebar}
        </div>
      </div>
      {hasOutlet && <Outlet />}
    </div>
  );
};

const Main = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) => {
  return (
    <div className={clx("flex w-full flex-col gap-y-3", className)} {...props}>
      {children}
    </div>
  );
};

const Sidebar = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) => {
  return (
    <div
      className={clx(
        "flex w-full max-w-[100%] flex-col gap-y-3 xl:mt-0 xl:max-w-[440px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const TwoColumnPage = Object.assign(Root, { Main, Sidebar });
