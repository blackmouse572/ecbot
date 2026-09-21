import { Outlet } from "react-router-dom";
import type { PageProps } from "./type";

export const SingleColumnPage = <TData,>({
  children,
  /**
   * Data of the page which is passed to Widgets, JSON view, and Metadata view.
   */
  data,
  /**
   * Whether the page should render an outlet for children routes. Defaults to true.
   */
  hasOutlet = true,
}: PageProps<TData>) => {
  return (
    <div className="flex flex-col gap-y-3 w-full">
      {children}
      {hasOutlet && <Outlet />}
    </div>
  );
};
