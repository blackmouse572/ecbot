import { createContext, useContext, type PropsWithChildren } from "react";

export type NavAbility = { action: string; subject: string };

/**
 * Called once per ability check inside `NavItem`'s child-filtering `useMemo` —
 * pass a referentially stable function (e.g. wrapped in `useCallback`) so
 * that memo doesn't re-run on every render.
 */
type NavAccess = (ability: NavAbility) => boolean;

const NavAccessContext = createContext<NavAccess>(() => true);

export const NavAccessProvider = ({
  can,
  children,
}: PropsWithChildren<{ can: NavAccess }>) => (
  <NavAccessContext.Provider value={can}>{children}</NavAccessContext.Provider>
);

/**
 * Defaults to allow-all when no `NavAccessProvider` is mounted — do not
 * change this to deny-all. Apps without an ability system (e.g. apps/admin,
 * at least initially) render `NavItem` with no provider at all, and must
 * still see every item, including ones that declare an `ability`. See the
 * "without a NavAccessProvider" case in nav-item.test.tsx.
 */
export const useNavAccess = () => useContext(NavAccessContext);
