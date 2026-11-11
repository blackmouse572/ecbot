import {
  orderWorkspaceControllerCancelV1,
  orderWorkspaceControllerConfirmV1,
  orderWorkspaceControllerCreateV1,
  orderWorkspaceControllerGetV1,
  orderWorkspaceControllerImportV1,
  orderWorkspaceControllerListV1,
  orderWorkspaceControllerSummaryV1,
  orderWorkspaceControllerUpdateV1,
  type OrderCreateRequestDto,
  type OrderGetResponseDto,
  type OrderImportResponseDto,
  type OrderImportRowRequestDto,
  type OrderItemGetResponseDto,
  type OrderItemRequestDto,
  type OrderSummaryResponseDto,
  type OrderUpdateRequestDto,
  type OrderWorkspaceControllerListV1Data,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { customerQueryKeys } from "./customers";
import { orderQueryKeys, productGroupQueryKeys } from "./order-query-keys";

export type {
  OrderCreateRequestDto,
  OrderGetResponseDto,
  OrderImportResponseDto,
  OrderImportRowRequestDto,
  OrderItemGetResponseDto,
  OrderItemRequestDto,
  OrderSummaryResponseDto,
  OrderUpdateRequestDto,
};

export { ORDER_QUERY_KEY, orderQueryKeys } from "./order-query-keys";

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

/**
 * A customer's confirmed orders added up. Keyed under the lists, so every
 * order change refreshes it.
 */
export const useCustomerOrderSummary = (
  workspace: string,
  customer: string,
) => {
  const { data, ...rest } = useQuery({
    queryKey: [...orderQueryKeys.lists(), "summary", workspace, customer],
    queryFn: () =>
      orderWorkspaceControllerSummaryV1({
        path: { workspace },
        query: { customer },
      }).then((res) => res.data.data),
    enabled: !!workspace && !!customer,
  });

  return { ...rest, summary: data };
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

/** Sends each request's rows in turn: the endpoint takes 200 rows at most. */
const importOrderChunks = async (
  workspace: string,
  chunks: OrderImportRowRequestDto[][],
  dryRun: boolean,
  onChunk?: (result: OrderImportResponseDto) => void,
) => {
  const results: OrderImportResponseDto[] = [];

  for (const rows of chunks) {
    const result = await orderWorkspaceControllerImportV1({
      path: { workspace },
      body: { rows, dryRun },
    }).then((res) => res.data.data);

    results.push(result);
    onChunk?.(result);
  }

  return results;
};

/** What a file would import, one result per request; writes nothing. */
export const useOrderImportPreview = (
  workspace: string,
  chunks: OrderImportRowRequestDto[][],
) =>
  useQuery({
    queryKey: [...orderQueryKeys.all, "import-preview", workspace, chunks],
    queryFn: () => importOrderChunks(workspace, chunks, true),
    enabled: !!workspace && chunks.length > 0,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

export const useImportOrders = (workspace: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chunks,
      onChunk,
    }: {
      chunks: OrderImportRowRequestDto[][];
      onChunk?: (result: OrderImportResponseDto) => void;
    }) => importOrderChunks(workspace, chunks, false, onChunk),
    // Also after a failure: the requests before it were imported.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productGroupQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
    },
  });
};
