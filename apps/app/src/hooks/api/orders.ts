import { queryKeysFactory } from "@/libs/query-factory";
import {
  orderWorkspaceControllerCancelV1,
  orderWorkspaceControllerConfirmV1,
  orderWorkspaceControllerCreateV1,
  orderWorkspaceControllerGetV1,
  orderWorkspaceControllerListV1,
  orderWorkspaceControllerUpdateV1,
  type OrderCreateRequestDto,
  type OrderGetResponseDto,
  type OrderItemGetResponseDto,
  type OrderItemRequestDto,
  type OrderUpdateRequestDto,
  type OrderWorkspaceControllerListV1Data,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { productGroupQueryKeys } from "./product-groups";

export type {
  OrderCreateRequestDto,
  OrderGetResponseDto,
  OrderItemGetResponseDto,
  OrderItemRequestDto,
  OrderUpdateRequestDto,
};

export const ORDER_QUERY_KEY = "orders" as const;
export const orderQueryKeys = queryKeysFactory(ORDER_QUERY_KEY);

export type OrderListParams = NonNullable<
  OrderWorkspaceControllerListV1Data["query"]
>;

export const orderListQueryOptions = (
  workspace: string,
  params?: OrderListParams,
) =>
  queryOptions({
    queryKey: orderQueryKeys.list({ workspace, ...params }),
    queryFn: () =>
      orderWorkspaceControllerListV1({
        path: { workspace },
        query: params,
      }).then((res) => res.data),
  });

export const orderDetailQueryOptions = (workspace: string, id: string) =>
  queryOptions({
    queryKey: orderQueryKeys.detail(id),
    queryFn: () =>
      orderWorkspaceControllerGetV1({
        path: { workspace, order: id },
      }).then((res) => res.data.data),
  });

export const useOrders = (
  workspace: string,
  params?: OrderListParams,
  options?: { enabled?: boolean },
) => {
  const { data, ...rest } = useQuery({
    ...orderListQueryOptions(workspace, params),
    enabled: !!workspace && options?.enabled !== false,
  });

  return {
    ...rest,
    orders: data?.data ?? [],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useOrder = (workspace: string, id: string) => {
  const { data, ...rest } = useQuery({
    ...orderDetailQueryOptions(workspace, id),
    enabled: !!workspace && !!id,
  });

  return { ...rest, order: data };
};

/** A confirmed or cancelled order changes the learned cycles, so groups refresh too. */
const useInvalidateOrders = () => {
  const queryClient = useQueryClient();

  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: orderQueryKeys.lists() });
    queryClient.invalidateQueries({ queryKey: productGroupQueryKeys.all });

    if (id) {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(id) });
    }
  };
};

export const useCreateOrder = (workspace: string) => {
  const invalidate = useInvalidateOrders();

  return useMutation({
    mutationFn: (body: OrderCreateRequestDto) =>
      orderWorkspaceControllerCreateV1({
        path: { workspace },
        body,
      }).then((res) => res.data.data),
    onSuccess: () => invalidate(),
  });
};

export const useUpdateOrder = (workspace: string, id: string) => {
  const invalidate = useInvalidateOrders();

  return useMutation({
    mutationFn: (body: OrderUpdateRequestDto) =>
      orderWorkspaceControllerUpdateV1({
        path: { workspace, order: id },
        body,
      }).then((res) => res.data.data),
    onSuccess: () => invalidate(id),
  });
};

export const useConfirmOrder = (workspace: string, id: string) => {
  const invalidate = useInvalidateOrders();

  return useMutation({
    mutationFn: () =>
      orderWorkspaceControllerConfirmV1({
        path: { workspace, order: id },
      }).then((res) => res.data.data),
    onSuccess: () => invalidate(id),
  });
};

export const useCancelOrder = (workspace: string, id: string) => {
  const invalidate = useInvalidateOrders();

  return useMutation({
    mutationFn: () =>
      orderWorkspaceControllerCancelV1({
        path: { workspace, order: id },
      }).then((res) => res.data.data),
    onSuccess: () => invalidate(id),
  });
};
