import { useMe } from "@/hooks/api";
import { useEffect, type FC } from "react";
import { analytics } from "./analytics";

/**
 * Tells analytics who is signed in (their id only), on profile load. Shares
 * the profile query the rest of the app already makes.
 */
export const AnalyticsIdentity: FC = () => {
  const userId = useMe().user?.id;
  useEffect(() => {
    analytics.identify(userId);
  }, [userId]);
  return null;
};
