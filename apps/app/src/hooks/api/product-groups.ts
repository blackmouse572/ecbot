import {
  productGroupWorkspaceControllerCreateV1,
  productGroupWorkspaceControllerDeleteV1,
  productGroupWorkspaceControllerListV1,
  productGroupWorkspaceControllerUpdateV1,
  type ProductGroupCreateRequestDto,
  type ProductGroupGetResponseDto,
  type ProductGroupUpdateRequestDto,
  type ProductGroupWorkspaceControllerListV1Data,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { orderQueryKeys, productGroupQueryKeys } from "./order-query-keys";

export type {
  ProductGroupCreateRequestDto,
  ProductGroupGetResponseDto,
  ProductGroupUpdateRequestDto,
};

export {
  PRODUCT_GROUP_QUERY_KEY,
  productGroupQueryKeys,
} from "./order-query-keys";

export type ProductGroupListParams = NonNullable<
  ProductGroupWorkspaceControllerListV1Data["query"]
>;

export const productGroupListQueryOptions = (
  workspace: string,
  params?: ProductGroupListParams,
) =>
  queryOptions({
    queryKey: productGroupQueryKeys.list({ workspace, ...params }),
    queryFn: () =>
      productGroupWorkspaceControllerListV1({
        path: { workspace },
        query: params,
      }).then((res) => res.data),
  });

export const useProductGroups = (
  workspace: string,
  params?: ProductGroupListParams,
) => {
  const { data, ...rest } = useQuery({
    ...productGroupListQueryOptions(workspace, params),
    enabled: !!workspace,
  });

  return {
    ...rest,
    groups: data?.data ?? [],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useCreateProductGroup = (workspace: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ProductGroupCreateRequestDto) =>
      productGroupWorkspaceControllerCreateV1({
        path: { workspace },
        body,
      }).then((res) => res.data.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productGroupQueryKeys.all }),
  });
};

export const useUpdateProductGroup = (workspace: string, id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ProductGroupUpdateRequestDto) =>
      productGroupWorkspaceControllerUpdateV1({
        path: { workspace, productGroup: id },
        body,
      }).then((res) => res.data.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productGroupQueryKeys.all }),
  });
};

/** Items keep their name and lose the group, so orders refresh too. */
export const useDeleteProductGroup = (workspace: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      productGroupWorkspaceControllerDeleteV1({
        path: { workspace, productGroup: id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productGroupQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    },
  });
};
