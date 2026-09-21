import { TriangleRightMini } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import { type ReactNode } from "react";
import { Link, type UIMatch, useMatches } from "react-router-dom";

export const Breadcrumbs = () => {
  const matches = useMatches() as unknown as UIMatch<
    unknown,
    {
      breadcrumb?: (match?: UIMatch) => string | ReactNode;
    }
  >[];

  const crumbs = matches
    .filter((match) => match.handle?.breadcrumb)
    .map((match) => {
      const handle = match.handle;

      let label: string | ReactNode | undefined = undefined;

      try {
        label = handle.breadcrumb?.(match);
      } catch (error) {
        console.error(
          "Error while rendering breadcrumb for route",
          match.pathname,
          error,
        );
        // noop
      }

      if (!label) {
        return null;
      }

      return {
        label: label,
        path: match.pathname,
      };
    })
    .filter(Boolean) as { label: string | ReactNode; path: string }[];

  return (
    <ol
      className={clx(
        "text-ui-fg-muted txt-compact-small-plus flex select-none items-center",
      )}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const isSingle = crumbs.length === 1;
        return (
          <li key={index} className={clx("flex items-center")}>
            {!isLast ? (
              <Link
                className="transition-fg hover:text-ui-fg-subtle"
                to={crumb.path}
              >
                {crumb.label}
              </Link>
            ) : (
              <div>
                {!isSingle && <span className="block lg:hidden">...</span>}
                <span
                  key={index}
                  className={clx({
                    "hidden lg:block": !isSingle,
                  })}
                >
                  {crumb.label}
                </span>
              </div>
            )}
            {!isLast && (
              <span className="mx-2">
                <TriangleRightMini />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
};
