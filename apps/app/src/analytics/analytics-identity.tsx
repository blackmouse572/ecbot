import { meQueryOptions } from "@/hooks/api";
import type { UserProfileResponseDto } from "@repo/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, type FC } from "react";
import { analytics } from "./analytics";

/** Tells analytics who is signed in (their id only), on profile load. */
export const AnalyticsIdentity: FC = () => {
  const { data } = useQuery(meQueryOptions());
  const userId = (data?.data as { data?: UserProfileResponseDto } | undefined)
    ?.data?.id;
  useEffect(() => {
    analytics.identify(userId);
  }, [userId]);
  return null;
};
