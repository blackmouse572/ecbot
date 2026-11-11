import { queryKeysFactory } from "@/libs/query-factory";
import {
  customerMarketingWorkspaceControllerGetV1,
  customerMarketingWorkspaceControllerListEventsV1,
  customerMarketingWorkspaceControllerUpdateV1,
  type CustomerMarketingStateGetResponseDto,
  type CustomerMarketingStateUpdateRequestDto,
  type CustomerMarketingSummaryResponseDto,
  type MarketingEventGetResponseDto,
} from "@repo/client";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { customerQueryKeys } from "./customers";
import { useWorkspace } from "./workspace";

export type {
  CustomerMarketingStateGetResponseDto,
  CustomerMarketingStateUpdateRequestDto,
  CustomerMarketingSummaryResponseDto,
  MarketingEventGetResponseDto,
};

export const CUSTOMER_MARKETING_QUERY_KEY = "customer-marketing" as const;

export const customerMarketingQueryKeys = queryKeysFactory(
  CUSTOMER_MARKETING_QUERY_KEY,
);

const EVENTS_PER_PAGE = 20;

/** A customer's labels, each with the event that explains it. */
export const useCustomerMarketing = (customerId: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerMarketingQueryKeys.detail(customerId ?? ""),
    enabled: !!slug && !!customerId,
    queryFn: () =>
      customerMarketingWorkspaceControllerGetV1({
        path: { workspace: slug!, id: customerId! },
        throwOnError: true,
      }).then((res) => res.data.data),
  });

  return { ...rest, marketing: data };
};

/** Every label change of a customer, newest first, a page at a time. */
export const useCustomerMarketingEvents = (
  customerId: string | undefined | null,
  options?: { enabled?: boolean },
) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useInfiniteQuery({
    queryKey: customerMarketingQueryKeys.detail(customerId ?? "", {
      events: true,
    }),
    enabled: !!slug && !!customerId && options?.enabled !== false,
    queryFn: ({ pageParam }) =>
      customerMarketingWorkspaceControllerListEventsV1({
        path: { workspace: slug!, id: customerId! },
        query: { page: pageParam, perPage: EVENTS_PER_PAGE },
        throwOnError: true,
      }).then((res) => res.data),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => {
      const totalPage = last?._metadata?.pagination?.totalPage ?? 1;

      return pages.length < totalPage ? pages.length + 1 : undefined;
    },
  });

  const events = useMemo(
    () =>
      (data?.pages.flatMap((page) => page?.data ?? []) ??
        []) as MarketingEventGetResponseDto[],
    [data?.pages],
  );

  const total = data?.pages[0]?._metadata?.pagination?.total ?? 0;

  return { ...rest, events, total };
};

/** Sets labels by hand; the reason is required and lands in the timeline. */
export const useUpdateCustomerMarketing = (customerId: string) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CustomerMarketingStateUpdateRequestDto) =>
      customerMarketingWorkspaceControllerUpdateV1({
        path: { workspace: slug!, id: customerId },
        body,
        throwOnError: true,
      }).then((res) => res.data.data),
    onSuccess: () => {
      // The labels and their timeline both sit under this customer's key.
      queryClient.invalidateQueries({
        queryKey: [...customerMarketingQueryKeys.details(), customerId],
      });
      // List rows carry the labels too.
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
    },
  });
};
